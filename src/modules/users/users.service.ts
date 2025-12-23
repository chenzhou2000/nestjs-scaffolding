import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../entities/user.entity'
import { CreateUserDto } from '../../dto/create-user.dto'
import { UpdateUserDto } from '../../dto/update-user.dto'
import { QueryUserDto, PaginatedResult } from '../../dto/query-user.dto'
import { CacheService } from '../cache/cache.service'
import { Performance } from '../../common/decorators/performance.decorator'
import { DatabaseCircuitBreaker, RedisCircuitBreaker } from '../../common/decorators/circuit-breaker.decorator'
import {
  ResourceNotFoundException,
  ResourceConflictException,
  DatabaseException,
  RedisException,
} from '../../common/exceptions'
import { RetryUtil } from '../../common/retry/retry.util'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class UsersService {
  private readonly userCachePrefix = 'user'
  private readonly userListCachePrefix = 'user-list'
  private readonly defaultCacheTTL = 300 // 5 minutes

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  @Performance('User Creation')
  @DatabaseCircuitBreaker()
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // 检查邮箱是否已存在
      const existingUser = await RetryUtil.executeWithRetry(
        () => this.userRepository.findOne({
          where: { email: createUserDto.email },
        }),
        { maxAttempts: 2, baseDelay: 500 }
      )

      if (existingUser) {
        throw new ResourceConflictException('User', 'email', createUserDto.email)
      }

      // 哈希密码
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10)

      // 创建用户
      const user = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
      })

      const savedUser = await RetryUtil.executeWithRetry(
        () => this.userRepository.save(user),
        { maxAttempts: 3, baseDelay: 1000 }
      )

      // Cache the new user with error handling
      try {
        await this.cacheUser(savedUser)
        await this.clearUserListCache()
      } catch (error) {
        // Log cache error but don't fail the operation
        console.warn('Cache operation failed during user creation:', error.message)
      }

      return savedUser
    } catch (error) {
      if (error.code?.includes('ER_DUP_ENTRY')) {
        throw new ResourceConflictException('User', 'email', createUserDto.email)
      }
      if (error.name === 'QueryFailedError') {
        throw new DatabaseException('create user', error)
      }
      throw error
    }
  }

  @Performance('User List Query')
  async findAll(queryDto: QueryUserDto): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, search, role, isActive } = queryDto
    
    // Create cache key based on query parameters
    const cacheKey = this.buildUserListCacheKey(queryDto)
    
    // Try to get from cache first
    const cachedResult = await this.cacheService.get<PaginatedResult<User>>(
      cacheKey,
      this.userListCachePrefix
    )
    
    if (cachedResult) {
      return cachedResult
    }

    const skip = (page - 1) * limit

    const queryBuilder = this.userRepository.createQueryBuilder('user')

    // 应用筛选条件
    if (search) {
      queryBuilder.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
      )
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role })
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive })
    }

    // 应用分页
    queryBuilder.skip(skip).take(limit)

    // 按创建日期排序
    queryBuilder.orderBy('user.createdAt', 'DESC')

    const [data, total] = await queryBuilder.getManyAndCount()
    const totalPages = Math.ceil(total / limit)

    const result = {
      data,
      total,
      page,
      limit,
      totalPages,
    }

    // Cache the result
    await this.cacheService.set(cacheKey, result, {
      ttl: this.defaultCacheTTL,
      prefix: this.userListCachePrefix,
    })

    return result
  }

  @Performance('User Lookup by ID')
  @DatabaseCircuitBreaker()
  async findById(id: string): Promise<User> {
    try {
      // Try to get from cache first with error handling
      let cachedUser: User | null = null
      try {
        cachedUser = await this.cacheService.get<User>(
          id,
          this.userCachePrefix
        )
      } catch (error) {
        console.warn('Cache read failed for user lookup:', error.message)
      }
      
      if (cachedUser) {
        return cachedUser
      }

      const user = await RetryUtil.executeWithRetry(
        () => this.userRepository.findOne({
          where: { id },
          relations: ['files'],
        }),
        { maxAttempts: 2, baseDelay: 500 }
      )

      if (!user) {
        throw new ResourceNotFoundException('User', id)
      }

      // Cache the user with error handling
      try {
        await this.cacheUser(user)
      } catch (error) {
        console.warn('Cache write failed for user:', error.message)
      }

      return user
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        throw error
      }
      if (error.name === 'QueryFailedError') {
        throw new DatabaseException('find user by id', error)
      }
      throw error
    }
  }

  @Performance('User Lookup by Email')
  async findByEmail(email: string): Promise<User | null> {
    // Try to get from cache first
    const cacheKey = `email:${email}`
    const cachedUser = await this.cacheService.get<User>(
      cacheKey,
      this.userCachePrefix
    )
    
    if (cachedUser) {
      return cachedUser
    }

    const user = await this.userRepository.findOne({
      where: { email },
    })

    if (user) {
      // Cache the user by email
      await this.cacheService.set(cacheKey, user, {
        ttl: this.defaultCacheTTL,
        prefix: this.userCachePrefix,
      })
    }

    return user
  }

  @Performance('User Update')
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id)

    // 检查邮箱是否被更新且是否已存在
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      })

      if (existingUser) {
        throw new ResourceConflictException('User', 'email', updateUserDto.email)
      }
    }

    // 更新用户
    Object.assign(user, updateUserDto)
    const updatedUser = await this.userRepository.save(user)

    // Update cache
    await this.cacheUser(updatedUser)

    // Clear user list cache since user data changed
    await this.clearUserListCache()

    // If email was changed, clear the old email cache
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      await this.cacheService.del(`email:${user.email}`, this.userCachePrefix)
    }

    return updatedUser
  }

  @Performance('User Deletion')
  async delete(id: string): Promise<void> {
    const user = await this.findById(id)
    await this.userRepository.remove(user)

    // Clear user from cache
    await this.clearUserCache(user)

    // Clear user list cache since user was deleted
    await this.clearUserListCache()
  }

  async count(): Promise<number> {
    return await this.userRepository.count()
  }

  /**
   * Cache helper methods with error handling
   */
  @RedisCircuitBreaker()
  private async cacheUser(user: User): Promise<void> {
    try {
      // Cache by ID
      await this.cacheService.set(user.id, user, {
        ttl: this.defaultCacheTTL,
        prefix: this.userCachePrefix,
      })

      // Cache by email
      await this.cacheService.set(`email:${user.email}`, user, {
        ttl: this.defaultCacheTTL,
        prefix: this.userCachePrefix,
      })
    } catch (error) {
      throw new RedisException('cache user', error)
    }
  }

  @RedisCircuitBreaker()
  private async clearUserCache(user: User): Promise<void> {
    try {
      // Clear cache by ID
      await this.cacheService.del(user.id, this.userCachePrefix)

      // Clear cache by email
      await this.cacheService.del(`email:${user.email}`, this.userCachePrefix)
    } catch (error) {
      throw new RedisException('clear user cache', error)
    }
  }

  @RedisCircuitBreaker()
  private async clearUserListCache(): Promise<void> {
    try {
      // Clear all user list cache entries
      const pattern = '*'
      const keys = await this.cacheService.keys(pattern, this.userListCachePrefix)
      
      for (const key of keys) {
        const cacheKey = key.split(':').pop()
        if (cacheKey) {
          await this.cacheService.del(cacheKey, this.userListCachePrefix)
        }
      }
    } catch (error) {
      throw new RedisException('clear user list cache', error)
    }
  }

  private buildUserListCacheKey(queryDto: QueryUserDto): string {
    const { page = 1, limit = 10, search, role, isActive } = queryDto
    const keyParts = [`page:${page}`, `limit:${limit}`]

    if (search) {
      keyParts.push(`search:${search}`)
    }

    if (role) {
      keyParts.push(`role:${role}`)
    }

    if (isActive !== undefined) {
      keyParts.push(`active:${isActive}`)
    }

    return keyParts.join(':')
  }
}