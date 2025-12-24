# 用户管理模块

## 概述

用户管理模块是NestJS应用的核心功能模块，提供完整的用户生命周期管理功能。该模块实现了用户的创建、查询、更新和删除操作（CRUD），并集成了缓存、权限控制、数据验证和错误处理等高级功能。

### 核心特性

- **完整的CRUD操作**: 支持用户的创建、查询、更新和删除
- **数据传输对象(DTO)验证**: 使用class-validator进行严格的数据验证
- **TypeORM实体关系**: 完整的数据库实体映射和关系管理
- **缓存集成**: Redis缓存提升查询性能
- **权限控制**: 基于角色的访问控制(RBAC)
- **分页查询**: 支持高效的分页和搜索功能
- **性能监控**: 集成性能装饰器监控操作耗时
- **熔断保护**: 数据库和Redis操作的熔断机制
- **重试机制**: 自动重试失败的数据库操作

### 技术栈

- **NestJS**: 企业级Node.js框架
- **TypeORM**: 对象关系映射(ORM)框架
- **MySQL**: 关系型数据库
- **Redis**: 内存缓存数据库
- **class-validator**: 数据验证库
- **class-transformer**: 数据转换库
- **bcryptjs**: 密码哈希库

## 功能特性

### 用户CRUD操作

用户管理模块提供了完整的CRUD操作，每个操作都经过精心设计以确保数据一致性、性能和安全性。

#### 创建用户 (Create)

创建用户操作包含邮箱唯一性验证、密码哈希处理和缓存更新。

**实现原理**:
1. 接收并验证CreateUserDto数据
2. 检查邮箱是否已存在，避免重复注册
3. 使用bcrypt对密码进行哈希处理
4. 保存用户到数据库
5. 更新缓存并清理相关缓存

**代码实现**:
```typescript
@Performance('User Creation')
@DatabaseCircuitBreaker()
async create(createUserDto: CreateUserDto): Promise<User> {
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

  // 更新缓存
  await this.cacheUser(savedUser)
  await this.clearUserListCache()

  return savedUser
}
```

#### 查询用户 (Read)

查询操作支持单个用户查询、列表查询和分页搜索，并集成了多级缓存策略。

**单个用户查询**:
```typescript
@Performance('User Lookup by ID')
@DatabaseCircuitBreaker()
async findById(id: string): Promise<User> {
  // 优先从缓存获取
  const cachedUser = await this.cacheService.get<User>(
    id,
    this.userCachePrefix
  )
  
  if (cachedUser) {
    return cachedUser
  }

  // 数据库查询，包含关联关系
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

  // 缓存结果
  await this.cacheUser(user)
  return user
}
```

**分页列表查询**:
```typescript
async findAll(queryDto: QueryUserDto): Promise<PaginatedResult<User>> {
  const { page = 1, limit = 10, search, role, isActive } = queryDto
  
  // 构建缓存键
  const cacheKey = this.buildUserListCacheKey(queryDto)
  
  // 尝试从缓存获取
  const cachedResult = await this.cacheService.get<PaginatedResult<User>>(
    cacheKey,
    this.userListCachePrefix
  )
  
  if (cachedResult) {
    return cachedResult
  }

  const skip = (page - 1) * limit
  const queryBuilder = this.userRepository.createQueryBuilder('user')

  // 应用搜索条件
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

  // 应用分页和排序
  queryBuilder
    .skip(skip)
    .take(limit)
    .orderBy('user.createdAt', 'DESC')

  const [data, total] = await queryBuilder.getManyAndCount()
  const totalPages = Math.ceil(total / limit)

  const result = {
    data,
    total,
    page,
    limit,
    totalPages,
  }

  // 缓存结果
  await this.cacheService.set(cacheKey, result, {
    ttl: this.defaultCacheTTL,
    prefix: this.userListCachePrefix,
  })

  return result
}
```

#### 更新用户 (Update)

更新操作支持部分字段更新，包含邮箱唯一性验证和缓存同步。

```typescript
@Performance('User Update')
async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
  const user = await this.findById(id)

  // 检查邮箱更新的唯一性
  if (updateUserDto.email && updateUserDto.email !== user.email) {
    const existingUser = await this.userRepository.findOne({
      where: { email: updateUserDto.email },
    })

    if (existingUser) {
      throw new ResourceConflictException('User', 'email', updateUserDto.email)
    }
  }

  // 更新用户数据
  Object.assign(user, updateUserDto)
  const updatedUser = await this.userRepository.save(user)

  // 更新缓存
  await this.cacheUser(updatedUser)
  await this.clearUserListCache()

  // 清理旧邮箱缓存
  if (updateUserDto.email && updateUserDto.email !== user.email) {
    await this.cacheService.del(`email:${user.email}`, this.userCachePrefix)
  }

  return updatedUser
}
```

#### 删除用户 (Delete)

删除操作包含软删除和硬删除选项，并自动清理相关缓存。

```typescript
@Performance('User Deletion')
async delete(id: string): Promise<void> {
  const user = await this.findById(id)
  await this.userRepository.remove(user)

  // 清理缓存
  await this.clearUserCache(user)
  await this.clearUserListCache()
}
```

### DTO验证和管道使用

用户管理模块使用class-validator和class-transformer实现严格的数据验证和转换。

#### CreateUserDto - 创建用户数据传输对象

```typescript
export class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  firstName: string

  @IsString()
  lastName: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
```

**验证规则说明**:
- `@IsEmail()`: 验证邮箱格式的有效性
- `@MinLength(6)`: 确保密码至少6个字符
- `@IsString()`: 验证字符串类型
- `@IsOptional()`: 标记可选字段
- `@IsEnum(UserRole)`: 验证角色枚举值
- `@IsBoolean()`: 验证布尔类型

#### UpdateUserDto - 更新用户数据传输对象

```typescript
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  firstName?: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
```

#### QueryUserDto - 查询参数数据传输对象

```typescript
export class QueryUserDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean()
  isActive?: boolean
}
```

**高级验证特性**:
- `@Type(() => Number)`: 自动类型转换
- `@Min(1)`: 数值范围验证
- `@Transform()`: 自定义数据转换逻辑

#### UserResponseDto - 响应数据传输对象

```typescript
export class UserResponseDto {
  id: string
  email: string
  
  @Exclude()
  password: string  // 排除敏感信息
  
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**数据转换使用**:
```typescript
// 在控制器中使用plainToClass进行数据转换
return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
```

### TypeORM实体关系和查询方法

#### User实体定义

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => File, (file) => file.user)
  files: File[]
}
```

**实体特性说明**:
- `@PrimaryGeneratedColumn('uuid')`: UUID主键自动生成
- `@Column({ unique: true })`: 唯一约束
- `@Column({ type: 'enum' })`: 枚举类型字段
- `@CreateDateColumn()/@UpdateDateColumn()`: 自动时间戳
- `@OneToMany()`: 一对多关系映射

#### 高级查询方法

**QueryBuilder查询**:
```typescript
const queryBuilder = this.userRepository.createQueryBuilder('user')

// 复杂搜索条件
queryBuilder.andWhere(
  '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
  { search: `%${search}%` }
)

// 条件过滤
if (role) {
  queryBuilder.andWhere('user.role = :role', { role })
}

// 分页和排序
queryBuilder
  .skip(skip)
  .take(limit)
  .orderBy('user.createdAt', 'DESC')

// 执行查询并获取计数
const [data, total] = await queryBuilder.getManyAndCount()
```

**关系查询**:
```typescript
// 查询用户及其关联的文件
const user = await this.userRepository.findOne({
  where: { id },
  relations: ['files'],
})

// 使用QueryBuilder进行关系查询
const usersWithFiles = await this.userRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.files', 'file')
  .where('user.isActive = :isActive', { isActive: true })
  .getMany()
```

**Repository模式使用**:
```typescript
// 注入Repository
constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>,
) {}

// 基础查询方法
await this.userRepository.find()
await this.userRepository.findOne({ where: { email } })
await this.userRepository.save(user)
await this.userRepository.remove(user)
await this.userRepository.count()
```

## API接口

用户管理模块提供了RESTful API接口，支持完整的用户管理操作。所有接口都需要JWT认证，部分接口需要特定角色权限。

### 创建用户

- **方法**: POST
- **路径**: `/users`
- **权限**: ADMIN
- **描述**: 创建新用户账户

#### 请求格式

```typescript
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "张",
  "lastName": "三",
  "role": "user",        // 可选: user | admin | moderator
  "isActive": true       // 可选: 默认为true
}
```

#### 响应格式

```typescript
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "张",
  "lastName": "三",
  "role": "user",
  "isActive": true,
  "createdAt": "2023-12-01T10:00:00.000Z",
  "updatedAt": "2023-12-01T10:00:00.000Z"
}
```

### 获取用户列表

- **方法**: GET
- **路径**: `/users`
- **权限**: ADMIN, MODERATOR
- **描述**: 获取用户列表，支持分页和搜索

#### 查询参数

```typescript
{
  "page": 1,           // 可选: 页码，默认1
  "limit": 10,         // 可选: 每页数量，默认10
  "search": "张三",     // 可选: 搜索关键词
  "role": "user",      // 可选: 角色筛选
  "isActive": true     // 可选: 状态筛选
}
```

#### 响应格式

```typescript
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "张",
      "lastName": "三",
      "role": "user",
      "isActive": true,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "updatedAt": "2023-12-01T10:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

### 获取当前用户信息

- **方法**: GET
- **路径**: `/users/me`
- **权限**: 已认证用户
- **描述**: 获取当前登录用户的个人信息

#### 响应格式

```typescript
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "张",
  "lastName": "三",
  "role": "user",
  "isActive": true,
  "createdAt": "2023-12-01T10:00:00.000Z",
  "updatedAt": "2023-12-01T10:00:00.000Z"
}
```

### 获取指定用户信息

- **方法**: GET
- **路径**: `/users/:id`
- **权限**: ADMIN, MODERATOR
- **描述**: 根据用户ID获取用户详细信息

#### 路径参数

- `id`: 用户UUID

#### 响应格式

```typescript
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "张",
  "lastName": "三",
  "role": "user",
  "isActive": true,
  "createdAt": "2023-12-01T10:00:00.000Z",
  "updatedAt": "2023-12-01T10:00:00.000Z"
}
```

### 更新当前用户信息

- **方法**: PATCH
- **路径**: `/users/me`
- **权限**: 已认证用户
- **描述**: 更新当前用户的个人信息

#### 请求格式

```typescript
{
  "firstName": "李",     // 可选
  "lastName": "四",      // 可选
  "email": "new@example.com"  // 可选
}
```

### 更新指定用户信息

- **方法**: PATCH
- **路径**: `/users/:id`
- **权限**: ADMIN
- **描述**: 更新指定用户的信息

#### 请求格式

```typescript
{
  "firstName": "李",     // 可选
  "lastName": "四",      // 可选
  "email": "new@example.com",  // 可选
  "role": "moderator",   // 可选
  "isActive": false      // 可选
}
```

### 删除用户

- **方法**: DELETE
- **路径**: `/users/:id`
- **权限**: ADMIN
- **描述**: 删除指定用户

#### 路径参数

- `id`: 用户UUID

#### 响应格式

```typescript
// 204 No Content - 删除成功，无响应体
```

### 错误码说明

| 状态码 | 错误码 | 描述 | 解决方案 |
|--------|--------|------|----------|
| 400 | VALIDATION_ERROR | 请求数据验证失败 | 检查请求参数格式和必填字段 |
| 401 | UNAUTHORIZED | 未认证或令牌无效 | 重新登录获取有效令牌 |
| 403 | FORBIDDEN | 权限不足 | 确认用户具有相应操作权限 |
| 404 | USER_NOT_FOUND | 用户不存在 | 确认用户ID是否正确 |
| 409 | EMAIL_CONFLICT | 邮箱已存在 | 使用不同的邮箱地址 |
| 500 | INTERNAL_ERROR | 服务器内部错误 | 联系系统管理员 |

#### 错误响应格式

```typescript
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "email must be a valid email"
    }
  ]
}
```
## 分页查询详解

### 分页参数说明

用户管理模块提供了灵活的分页查询功能，支持多种查询条件和排序方式。

#### 基础分页参数

```typescript
interface PaginationParams {
  page: number      // 页码，从1开始
  limit: number     // 每页数量，建议范围1-100
}
```

#### 搜索和筛选参数

```typescript
interface FilterParams {
  search?: string    // 模糊搜索：姓名、邮箱
  role?: UserRole   // 角色筛选：user | admin | moderator
  isActive?: boolean // 状态筛选：true | false
}
```

### 分页响应格式详解

```typescript
interface PaginatedResult<T> {
  data: T[]           // 当前页数据
  total: number       // 总记录数
  page: number        // 当前页码
  limit: number       // 每页数量
  totalPages: number  // 总页数
}
```

#### 分页计算逻辑

```typescript
// 计算跳过的记录数
const skip = (page - 1) * limit

// 计算总页数
const totalPages = Math.ceil(total / limit)

// 判断是否有下一页
const hasNextPage = page < totalPages

// 判断是否有上一页
const hasPreviousPage = page > 1
```

### 高级查询示例

#### 复合条件查询

```bash
# 查询活跃的管理员用户，第2页，每页5条
GET /users?page=2&limit=5&role=admin&isActive=true

# 搜索姓名包含"张"的用户
GET /users?search=张&page=1&limit=10

# 查询所有非活跃用户
GET /users?isActive=false
```

#### 查询性能优化

**索引优化**:
```sql
-- 为常用查询字段创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(isActive);
CREATE INDEX idx_users_created_at ON users(createdAt);

-- 复合索引优化多条件查询
CREATE INDEX idx_users_role_active ON users(role, isActive);
```

**查询优化建议**:
1. **限制每页数量**: 建议limit不超过100，避免大量数据传输
2. **使用缓存**: 相同查询条件的结果会被缓存5分钟
3. **避免深度分页**: 大页码查询性能较差，建议使用游标分页
4. **合理使用搜索**: 模糊搜索会影响性能，考虑使用全文搜索

#### 缓存策略详解

**缓存键构建**:
```typescript
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
```

**缓存失效策略**:
- 用户创建/更新/删除时自动清理列表缓存
- 缓存TTL设置为5分钟
- 支持手动清理缓存

## 异常处理机制

### 异常类型分类

用户管理模块实现了完整的异常处理机制，包含业务异常、数据库异常和缓存异常。

#### 业务异常

**ResourceNotFoundException - 资源未找到异常**:
```typescript
// 用户不存在时抛出
if (!user) {
  throw new ResourceNotFoundException('User', id)
}

// 异常信息格式
{
  "statusCode": 404,
  "message": "User with id '550e8400-e29b-41d4-a716-446655440000' not found",
  "error": "Not Found",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/users/550e8400-e29b-41d4-a716-446655440000"
}
```

**ResourceConflictException - 资源冲突异常**:
```typescript
// 邮箱重复时抛出
if (existingUser) {
  throw new ResourceConflictException('User', 'email', createUserDto.email)
}

// 异常信息格式
{
  "statusCode": 409,
  "message": "User with email 'user@example.com' already exists",
  "error": "Conflict",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/users"
}
```

#### 数据库异常

**DatabaseException - 数据库操作异常**:
```typescript
try {
  const savedUser = await this.userRepository.save(user)
} catch (error) {
  if (error.name === 'QueryFailedError') {
    throw new DatabaseException('create user', error)
  }
  throw error
}

// 异常信息格式
{
  "statusCode": 500,
  "message": "Database operation failed: create user",
  "error": "Internal Server Error",
  "details": {
    "operation": "create user",
    "originalError": "ER_DUP_ENTRY: Duplicate entry 'user@example.com' for key 'email'"
  }
}
```

#### 缓存异常

**RedisException - Redis操作异常**:
```typescript
@RedisCircuitBreaker()
private async cacheUser(user: User): Promise<void> {
  try {
    await this.cacheService.set(user.id, user, {
      ttl: this.defaultCacheTTL,
      prefix: this.userCachePrefix,
    })
  } catch (error) {
    throw new RedisException('cache user', error)
  }
}
```

### 重试机制

**RetryUtil重试工具**:
```typescript
// 数据库操作重试配置
const savedUser = await RetryUtil.executeWithRetry(
  () => this.userRepository.save(user),
  { 
    maxAttempts: 3,      // 最大重试次数
    baseDelay: 1000,     // 基础延迟时间(ms)
    maxDelay: 5000,      // 最大延迟时间(ms)
    backoffFactor: 2     // 退避因子
  }
)
```

**重试策略**:
- **指数退避**: 每次重试延迟时间递增
- **最大重试次数**: 避免无限重试
- **异常类型过滤**: 只对可恢复的异常进行重试

### 熔断保护机制

#### 数据库熔断器

```typescript
@DatabaseCircuitBreaker()
async findById(id: string): Promise<User> {
  // 数据库操作受熔断器保护
}
```

**熔断器配置**:
- **失败阈值**: 连续5次失败触发熔断
- **超时时间**: 单次操作超时5秒
- **恢复时间**: 熔断后30秒尝试恢复
- **半开状态**: 允许少量请求测试服务恢复

#### Redis熔断器

```typescript
@RedisCircuitBreaker()
private async cacheUser(user: User): Promise<void> {
  // Redis操作受熔断器保护
}
```

### 错误处理最佳实践

#### 1. 分层错误处理

```typescript
// Service层：抛出业务异常
async create(createUserDto: CreateUserDto): Promise<User> {
  if (existingUser) {
    throw new ResourceConflictException('User', 'email', createUserDto.email)
  }
}

// Controller层：捕获并转换异常
@Post()
async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
  try {
    const user = await this.usersService.create(createUserDto)
    return plainToClass(UserResponseDto, user)
  } catch (error) {
    // 全局异常过滤器会处理异常转换
    throw error
  }
}
```

#### 2. 优雅降级

```typescript
// 缓存失败时的降级处理
async findById(id: string): Promise<User> {
  let cachedUser: User | null = null
  
  try {
    cachedUser = await this.cacheService.get<User>(id, this.userCachePrefix)
  } catch (error) {
    // 缓存失败不影响主要功能
    console.warn('Cache read failed for user lookup:', error.message)
  }
  
  if (cachedUser) {
    return cachedUser
  }

  // 降级到数据库查询
  const user = await this.userRepository.findOne({ where: { id } })
  
  if (!user) {
    throw new ResourceNotFoundException('User', id)
  }

  return user
}
```

#### 3. 错误日志记录

```typescript
// 结构化错误日志
catch (error) {
  this.logger.error('User creation failed', {
    operation: 'create_user',
    email: createUserDto.email,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  })
  
  throw new DatabaseException('create user', error)
}
```

## 性能优化建议

### 数据库性能优化

#### 1. 查询优化

**使用QueryBuilder进行复杂查询**:
```typescript
// 优化前：多次查询
const users = await this.userRepository.find()
const activeUsers = users.filter(user => user.isActive)

// 优化后：单次查询
const activeUsers = await this.userRepository
  .createQueryBuilder('user')
  .where('user.isActive = :isActive', { isActive: true })
  .getMany()
```

**选择性字段查询**:
```typescript
// 只查询需要的字段
const users = await this.userRepository
  .createQueryBuilder('user')
  .select(['user.id', 'user.email', 'user.firstName', 'user.lastName'])
  .getMany()
```

#### 2. 索引策略

**单列索引**:
```sql
-- 为频繁查询的字段创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(createdAt);
```

**复合索引**:
```sql
-- 为多条件查询创建复合索引
CREATE INDEX idx_users_role_active_created ON users(role, isActive, createdAt);
```

#### 3. 连接池优化

```typescript
// TypeORM连接配置
{
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'nestjs_app',
  extra: {
    connectionLimit: 10,        // 连接池大小
    acquireTimeout: 60000,      // 获取连接超时
    timeout: 60000,             // 查询超时
    reconnect: true,            // 自动重连
    charset: 'utf8mb4_unicode_ci'
  }
}
```

### 缓存性能优化

#### 1. 缓存策略

**多级缓存**:
```typescript
// L1: 应用内存缓存（短期）
// L2: Redis缓存（中期）
// L3: 数据库（长期）

async findById(id: string): Promise<User> {
  // L1: 检查内存缓存
  let user = this.memoryCache.get(id)
  if (user) return user

  // L2: 检查Redis缓存
  user = await this.cacheService.get(id, this.userCachePrefix)
  if (user) {
    this.memoryCache.set(id, user, 60) // 缓存1分钟
    return user
  }

  // L3: 查询数据库
  user = await this.userRepository.findOne({ where: { id } })
  if (user) {
    await this.cacheUser(user)
    this.memoryCache.set(id, user, 60)
  }

  return user
}
```

**缓存预热**:
```typescript
// 应用启动时预热热点数据
async onApplicationBootstrap() {
  const hotUsers = await this.userRepository
    .createQueryBuilder('user')
    .where('user.role IN (:...roles)', { roles: ['admin', 'moderator'] })
    .getMany()

  for (const user of hotUsers) {
    await this.cacheUser(user)
  }
}
```

#### 2. 缓存失效策略

**主动失效**:
```typescript
// 数据更新时主动清理缓存
async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
  const updatedUser = await this.userRepository.save(user)
  
  // 清理相关缓存
  await this.clearUserCache(user)
  await this.clearUserListCache()
  
  return updatedUser
}
```

**被动失效**:
```typescript
// 设置合理的TTL
await this.cacheService.set(cacheKey, result, {
  ttl: this.defaultCacheTTL,  // 5分钟TTL
  prefix: this.userListCachePrefix,
})
```

### 并发性能优化

#### 1. 数据库锁优化

**乐观锁**:
```typescript
@Entity('users')
export class User {
  @VersionColumn()
  version: number  // 版本号字段

  // 其他字段...
}

// 更新时检查版本号
async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
  const user = await this.findById(id)
  const originalVersion = user.version

  Object.assign(user, updateUserDto)
  
  try {
    return await this.userRepository.save(user)
  } catch (error) {
    if (error.message.includes('version')) {
      throw new ConflictException('User has been modified by another process')
    }
    throw error
  }
}
```

#### 2. 批量操作优化

**批量插入**:
```typescript
async createBatch(createUserDtos: CreateUserDto[]): Promise<User[]> {
  // 批量哈希密码
  const users = await Promise.all(
    createUserDtos.map(async (dto) => {
      const hashedPassword = await bcrypt.hash(dto.password, 10)
      return this.userRepository.create({
        ...dto,
        password: hashedPassword,
      })
    })
  )

  // 批量插入
  return await this.userRepository.save(users)
}
```

**批量更新**:
```typescript
async updateBatch(updates: Array<{id: string, data: UpdateUserDto}>): Promise<void> {
  const queryRunner = this.userRepository.manager.connection.createQueryRunner()
  
  await queryRunner.startTransaction()
  
  try {
    for (const update of updates) {
      await queryRunner.manager.update(User, update.id, update.data)
    }
    
    await queryRunner.commitTransaction()
  } catch (error) {
    await queryRunner.rollbackTransaction()
    throw error
  } finally {
    await queryRunner.release()
  }
}
```

### 监控和性能分析

#### 1. 性能装饰器

```typescript
@Performance('User Creation')
async create(createUserDto: CreateUserDto): Promise<User> {
  // 自动记录执行时间
}
```

#### 2. 慢查询监控

```typescript
// TypeORM配置
{
  logging: ['query', 'error', 'warn'],
  maxQueryExecutionTime: 1000,  // 记录超过1秒的查询
}
```

#### 3. 缓存命中率监控

```typescript
// 缓存服务中添加统计
class CacheService {
  private stats = {
    hits: 0,
    misses: 0,
  }

  async get<T>(key: string, prefix?: string): Promise<T | null> {
    const result = await this.redis.get(this.buildKey(key, prefix))
    
    if (result) {
      this.stats.hits++
    } else {
      this.stats.misses++
    }
    
    return result ? JSON.parse(result) : null
  }

  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses
    return total > 0 ? this.stats.hits / total : 0
  }
}
```
## 使用示例

### 基础使用方法

#### 创建用户服务实例

```typescript
import { UsersService } from './users.service'
import { CreateUserDto } from '../../dto/create-user.dto'

@Injectable()
export class UserManagementService {
  constructor(private readonly usersService: UsersService) {}

  async registerNewUser(userData: CreateUserDto) {
    try {
      const user = await this.usersService.create(userData)
      console.log('用户创建成功:', user.id)
      return user
    } catch (error) {
      console.error('用户创建失败:', error.message)
      throw error
    }
  }
}
```

#### 查询用户信息

```typescript
// 根据ID查询用户
async getUserById(userId: string) {
  try {
    const user = await this.usersService.findById(userId)
    return user
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      console.log('用户不存在')
      return null
    }
    throw error
  }
}

// 根据邮箱查询用户
async getUserByEmail(email: string) {
  const user = await this.usersService.findByEmail(email)
  return user
}

// 分页查询用户列表
async getUserList(page: number = 1, limit: number = 10) {
  const queryDto = { page, limit }
  const result = await this.usersService.findAll(queryDto)
  
  console.log(`共找到 ${result.total} 个用户，当前第 ${result.page} 页`)
  return result
}
```

### 高级功能示例

#### 带搜索条件的用户查询

```typescript
async searchUsers(searchParams: {
  keyword?: string
  role?: UserRole
  isActive?: boolean
  page?: number
  limit?: number
}) {
  const queryDto: QueryUserDto = {
    page: searchParams.page || 1,
    limit: searchParams.limit || 10,
    search: searchParams.keyword,
    role: searchParams.role,
    isActive: searchParams.isActive
  }

  const result = await this.usersService.findAll(queryDto)
  
  // 格式化搜索结果
  const formattedUsers = result.data.map(user => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role,
    status: user.isActive ? '活跃' : '非活跃',
    joinDate: user.createdAt.toLocaleDateString('zh-CN')
  }))

  return {
    users: formattedUsers,
    pagination: {
      current: result.page,
      total: result.totalPages,
      count: result.total
    }
  }
}
```

#### 批量用户操作

```typescript
async batchUpdateUserStatus(userIds: string[], isActive: boolean) {
  const results = []
  
  for (const userId of userIds) {
    try {
      const updatedUser = await this.usersService.update(userId, { isActive })
      results.push({ userId, success: true, user: updatedUser })
    } catch (error) {
      results.push({ userId, success: false, error: error.message })
    }
  }
  
  const successCount = results.filter(r => r.success).length
  console.log(`批量更新完成: ${successCount}/${userIds.length} 成功`)
  
  return results
}
```

### 集成示例

#### 与认证模块集成

```typescript
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    // 创建用户账户
    const createUserDto: CreateUserDto = {
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: UserRole.USER
    }

    const user = await this.usersService.create(createUserDto)
    
    // 生成JWT令牌
    const tokens = await this.authService.generateTokens(user)
    
    return {
      user: plainToClass(UserResponseDto, user),
      ...tokens
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // 验证用户凭据
    const user = await this.usersService.findByEmail(loginDto.email)
    
    if (!user || !await bcrypt.compare(loginDto.password, user.password)) {
      throw new UnauthorizedException('邮箱或密码错误')
    }

    if (!user.isActive) {
      throw new ForbiddenException('账户已被禁用')
    }

    // 生成令牌
    const tokens = await this.authService.generateTokens(user)
    
    return {
      user: plainToClass(UserResponseDto, user),
      ...tokens
    }
  }
}
```

#### 与文件模块集成

```typescript
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly filesService: FilesService
  ) {}

  @Get(':id/files')
  async getUserFiles(@Param('id') userId: string) {
    // 验证用户存在
    const user = await this.usersService.findById(userId)
    
    // 获取用户文件列表
    const files = await this.filesService.findByUserId(userId)
    
    return {
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`
      },
      files: files.map(file => ({
        id: file.id,
        filename: file.filename,
        size: file.size,
        uploadDate: file.createdAt
      }))
    }
  }

  @Delete(':id')
  async deleteUser(@Param('id') userId: string) {
    // 删除用户相关文件
    await this.filesService.deleteByUserId(userId)
    
    // 删除用户账户
    await this.usersService.delete(userId)
    
    return { message: '用户及相关数据删除成功' }
  }
}
```

## 最佳实践

### 推荐使用方法

#### 1. 数据验证最佳实践

```typescript
// 使用DTO进行严格的数据验证
export class CreateUserDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码至少需要8个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大小写字母和数字'
  })
  password: string

  @IsString({ message: '姓氏必须是字符串' })
  @Length(1, 50, { message: '姓氏长度必须在1-50个字符之间' })
  @Transform(({ value }) => value?.trim())
  firstName: string
}
```

#### 2. 错误处理最佳实践

```typescript
// 统一的错误处理方法
async createUserSafely(createUserDto: CreateUserDto): Promise<{
  success: boolean
  user?: User
  error?: string
}> {
  try {
    const user = await this.usersService.create(createUserDto)
    return { success: true, user }
  } catch (error) {
    if (error instanceof ResourceConflictException) {
      return { success: false, error: '邮箱已被注册' }
    }
    if (error instanceof ValidationException) {
      return { success: false, error: '输入数据格式错误' }
    }
    // 记录未知错误
    this.logger.error('用户创建失败', error)
    return { success: false, error: '系统错误，请稍后重试' }
  }
}
```

#### 3. 缓存使用最佳实践

```typescript
// 合理使用缓存装饰器
@Injectable()
export class UserProfileService {
  constructor(private readonly usersService: UsersService) {}

  // 用户基本信息缓存时间较长
  @Cacheable('user-profile', 300) // 5分钟
  async getUserProfile(userId: string) {
    return await this.usersService.findById(userId)
  }

  // 用户列表缓存时间较短
  @Cacheable('user-list', 60) // 1分钟
  async getUserList(queryDto: QueryUserDto) {
    return await this.usersService.findAll(queryDto)
  }

  // 更新后清理相关缓存
  @CacheEvict(['user-profile', 'user-list'])
  async updateUser(userId: string, updateDto: UpdateUserDto) {
    return await this.usersService.update(userId, updateDto)
  }
}
```

### 性能优化建议

#### 1. 查询优化

```typescript
// 避免N+1查询问题
async getUsersWithFiles(): Promise<User[]> {
  // 错误方式：会产生N+1查询
  // const users = await this.userRepository.find()
  // for (const user of users) {
  //   user.files = await this.fileRepository.find({ where: { userId: user.id } })
  // }

  // 正确方式：使用关联查询
  return await this.userRepository.find({
    relations: ['files'],
    select: ['id', 'email', 'firstName', 'lastName'] // 只选择需要的字段
  })
}
```

#### 2. 分页优化

```typescript
// 使用游标分页处理大数据集
async getUsersWithCursor(cursor?: string, limit: number = 20) {
  const queryBuilder = this.userRepository.createQueryBuilder('user')
  
  if (cursor) {
    queryBuilder.where('user.id > :cursor', { cursor })
  }
  
  const users = await queryBuilder
    .orderBy('user.id', 'ASC')
    .limit(limit + 1) // 多查询一条判断是否有下一页
    .getMany()
  
  const hasNextPage = users.length > limit
  if (hasNextPage) {
    users.pop() // 移除多查询的那一条
  }
  
  return {
    data: users,
    hasNextPage,
    nextCursor: hasNextPage ? users[users.length - 1].id : null
  }
}
```

### 安全注意事项

#### 1. 密码安全

```typescript
// 密码哈希配置
const BCRYPT_ROUNDS = 12 // 生产环境建议使用12轮

async hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_ROUNDS)
}

// 密码验证
async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}
```

#### 2. 数据脱敏

```typescript
// 响应数据脱敏
export class UserResponseDto {
  id: string
  email: string
  
  @Exclude() // 永远不返回密码
  password: string
  
  firstName: string
  lastName: string
  role: UserRole
  
  @Transform(({ value, obj }) => {
    // 只有管理员才能看到其他用户的详细信息
    return obj.role === UserRole.ADMIN ? value : undefined
  })
  isActive?: boolean
}
```

#### 3. 权限控制

```typescript
// 细粒度权限控制
@Controller('users')
export class UsersController {
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: User
  ) {
    // 普通用户只能查看自己的信息
    if (currentUser.role === UserRole.USER && currentUser.id !== id) {
      throw new ForbiddenException('无权访问其他用户信息')
    }
    
    return await this.usersService.findById(id)
  }
}
```

## 测试指南

### 单元测试示例

```typescript
describe('UsersService', () => {
  let service: UsersService
  let userRepository: Repository<User>
  let cacheService: CacheService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    cacheService = module.get<CacheService>(CacheService)
  })

  describe('create', () => {
    it('应该成功创建用户', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: '张',
        lastName: '三',
      }

      const expectedUser = {
        id: '1',
        ...createUserDto,
        password: 'hashedPassword',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null)
      jest.spyOn(userRepository, 'create').mockReturnValue(expectedUser as User)
      jest.spyOn(userRepository, 'save').mockResolvedValue(expectedUser as User)
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword')

      const result = await service.create(createUserDto)

      expect(result).toEqual(expectedUser)
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      })
      expect(userRepository.save).toHaveBeenCalled()
    })

    it('当邮箱已存在时应该抛出冲突异常', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: '李',
        lastName: '四',
      }

      const existingUser = { id: '1', email: 'existing@example.com' }
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(existingUser as User)

      await expect(service.create(createUserDto)).rejects.toThrow(
        ResourceConflictException
      )
    })
  })

  describe('findById', () => {
    it('应该从缓存返回用户', async () => {
      const userId = '1'
      const cachedUser = { id: userId, email: 'test@example.com' }

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedUser)

      const result = await service.findById(userId)

      expect(result).toEqual(cachedUser)
      expect(cacheService.get).toHaveBeenCalledWith(userId, service['userCachePrefix'])
      expect(userRepository.findOne).not.toHaveBeenCalled()
    })

    it('当用户不存在时应该抛出未找到异常', async () => {
      const userId = 'nonexistent'

      jest.spyOn(cacheService, 'get').mockResolvedValue(null)
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null)

      await expect(service.findById(userId)).rejects.toThrow(
        ResourceNotFoundException
      )
    })
  })
})
```

### 集成测试方法

```typescript
describe('UsersController (e2e)', () => {
  let app: INestApplication
  let userRepository: Repository<User>

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User))
    
    await app.init()
  })

  afterEach(async () => {
    await userRepository.clear()
    await app.close()
  })

  describe('/users (POST)', () => {
    it('应该创建新用户', () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: '张',
        lastName: '三',
      }

      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe(createUserDto.email)
          expect(res.body.firstName).toBe(createUserDto.firstName)
          expect(res.body.password).toBeUndefined() // 密码不应该返回
        })
    })

    it('当邮箱已存在时应该返回409', async () => {
      const createUserDto = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: '李',
        lastName: '四',
      }

      // 先创建一个用户
      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201)

      // 尝试创建重复邮箱的用户
      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(409)
    })
  })

  describe('/users (GET)', () => {
    it('应该返回分页的用户列表', async () => {
      // 创建测试数据
      const users = Array.from({ length: 15 }, (_, i) => ({
        email: `user${i}@example.com`,
        password: 'password123',
        firstName: `用户${i}`,
        lastName: '测试',
      }))

      for (const user of users) {
        await request(app.getHttpServer())
          .post('/users')
          .send(user)
      }

      // 测试分页
      return request(app.getHttpServer())
        .get('/users?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(10)
          expect(res.body.total).toBe(15)
          expect(res.body.totalPages).toBe(2)
        })
    })
  })
})
```

## 故障排除

### 常见问题解答

#### Q: 用户创建失败，提示邮箱已存在
**A**: 检查数据库中是否已有相同邮箱的用户记录。可以使用以下SQL查询：
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

#### Q: 查询用户列表性能很慢
**A**: 检查以下几个方面：
1. 确认数据库索引是否正确创建
2. 检查查询条件是否使用了索引
3. 考虑减少每页查询数量
4. 检查Redis缓存是否正常工作

#### Q: 缓存不生效，每次都查询数据库
**A**: 检查Redis连接配置和缓存键是否正确：
```typescript
// 检查Redis连接
await this.cacheService.ping()

// 检查缓存键格式
console.log('Cache key:', this.buildUserListCacheKey(queryDto))
```

#### Q: 用户更新后缓存没有更新
**A**: 确认缓存清理逻辑是否正确执行：
```typescript
// 在更新方法中添加日志
async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
  const updatedUser = await this.userRepository.save(user)
  
  console.log('Clearing cache for user:', id)
  await this.clearUserCache(user)
  await this.clearUserListCache()
  
  return updatedUser
}
```

### 错误处理方法

#### 数据库连接错误
```typescript
// 检查数据库连接状态
@Get('health/database')
async checkDatabase() {
  try {
    await this.userRepository.query('SELECT 1')
    return { status: 'ok', database: 'connected' }
  } catch (error) {
    return { status: 'error', database: 'disconnected', error: error.message }
  }
}
```

#### Redis连接错误
```typescript
// 检查Redis连接状态
@Get('health/redis')
async checkRedis() {
  try {
    await this.cacheService.ping()
    return { status: 'ok', redis: 'connected' }
  } catch (error) {
    return { status: 'error', redis: 'disconnected', error: error.message }
  }
}
```

### 调试技巧

#### 1. 启用详细日志

```typescript
// 在开发环境启用详细日志
if (process.env.NODE_ENV === 'development') {
  // TypeORM查询日志
  {
    logging: ['query', 'error', 'warn', 'info', 'log'],
    logger: 'advanced-console',
  }
}
```

#### 2. 性能监控

```typescript
// 添加性能监控中间件
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now()
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start
        const request = context.switchToHttp().getRequest()
        console.log(`${request.method} ${request.url} - ${duration}ms`)
      })
    )
  }
}
```

#### 3. 缓存调试

```typescript
// 缓存命中率统计
@Injectable()
export class CacheDebugService {
  private stats = new Map<string, { hits: number; misses: number }>()

  recordHit(key: string) {
    const stat = this.stats.get(key) || { hits: 0, misses: 0 }
    stat.hits++
    this.stats.set(key, stat)
  }

  recordMiss(key: string) {
    const stat = this.stats.get(key) || { hits: 0, misses: 0 }
    stat.misses++
    this.stats.set(key, stat)
  }

  getStats() {
    const result = {}
    for (const [key, stat] of this.stats) {
      const total = stat.hits + stat.misses
      result[key] = {
        ...stat,
        hitRate: total > 0 ? (stat.hits / total * 100).toFixed(2) + '%' : '0%'
      }
    }
    return result
  }
}
```

## 相关资源

- [NestJS官方文档](https://docs.nestjs.com/)
- [TypeORM官方文档](https://typeorm.io/)
- [class-validator文档](https://github.com/typestack/class-validator)
- [Redis缓存最佳实践](https://redis.io/docs/manual/patterns/)
- [MySQL性能优化指南](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [JWT认证最佳实践](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)