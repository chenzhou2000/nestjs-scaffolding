import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { User } from '../../entities/user.entity'
import { CreateUserDto } from '../../dto/create-user.dto'
import { UpdateUserDto } from '../../dto/update-user.dto'
import { QueryUserDto, PaginatedResult } from '../../dto/query-user.dto'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    return await this.userRepository.save(user)
  }

  async findAll(queryDto: QueryUserDto): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, search, role, isActive } = queryDto
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

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    }
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['files'],
    })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
    })
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
    return await this.userRepository.save(user)
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id)
    await this.userRepository.remove(user)
  }

  async count(): Promise<number> {
    return await this.userRepository.count()
  }
}