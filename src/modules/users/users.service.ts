import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { User } from '../../entities/user.entity'
import { CreateUserDto } from '../../dto/create-user.dto'
import { UpdateUserDto } from '../../dto/update-user.dto'
import { QueryUserDto, PaginatedResult } from '../../dto/query-user.dto'
import { CacheService } from '../cache/cache.service'
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

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    })

    if (existingUser) {
      throw new ConflictException('User with this email already exists')
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10)

    // 创建用户
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    })

    const savedUser = await this.userRepository.save(user)

    // Cache the new user
    await this.cacheUser(savedUser)

    // Clear user list cache since we added a new user
    await this.clearUserListCache()

    return savedUser
  }

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

  async findById(id: string): Promise<User> {
    // Try to get from cache first
    const cachedUser = await this.cacheService.get<User>(
      id,
      this.userCachePrefix
    )
    
    if (cachedUser) {
      return cachedUser
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['files'],
    })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    // Cache the user
    await this.cacheUser(user)

    return user
  }

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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id)

    // 检查邮箱是否被更新且是否已存在
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      })

      if (existingUser) {
        throw new ConflictException('User with this email already exists')
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
   * Cache helper methods
   */
  private async cacheUser(user: User): Promise<void> {
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
  }

  private async clearUserCache(user: User): Promise<void> {
    // Clear cache by ID
    await this.cacheService.del(user.id, this.userCachePrefix)

    // Clear cache by email
    await this.cacheService.del(`email:${user.email}`, this.userCachePrefix)
  }

  private async clearUserListCache(): Promise<void> {
    // Clear all user list cache entries
    const pattern = '*'
    const keys = await this.cacheService.keys(pattern, this.userListCachePrefix)
    
    for (const key of keys) {
      const cacheKey = key.split(':').pop()
      if (cacheKey) {
        await this.cacheService.del(cacheKey, this.userListCachePrefix)
      }
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