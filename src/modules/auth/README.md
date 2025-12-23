# 认证授权系统

该模块为NestJS Learning API实现了一个基于JWT的完整认证和基于角色的授权系统。

## 功能特性

- **JWT认证**：基于令牌的安全认证机制
- **基于角色的访问控制（RBAC）**：细粒度的权限系统
- **密码哈希**：使用bcrypt进行安全的密码存储
- **令牌黑名单**：带有令牌失效功能的登出机制
- **刷新令牌**：扩展的会话管理
- **守卫和装饰器**：易用的保护机制

## API 端点

### 认证端点

#### POST /auth/register

注册新用户账户。

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**响应：**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "isActive": true,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### POST /auth/login

认证用户并获取JWT令牌。

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  },
  "expiresIn": 3600
}
```

#### POST /auth/logout

登出用户并将当前令牌加入黑名单。

**请求头：**

```
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "message": "Successfully logged out"
}
```

#### POST /auth/refresh

使用刷新令牌获取新的访问令牌。

**请求体：**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应：**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  },
  "expiresIn": 3600
}
```

#### POST /auth/profile

获取当前用户资料。

**请求头：**

```
Authorization: Bearer <access_token>
```

**响应：**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "isActive": true,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## 使用示例

### 保护端点

#### 基本认证

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { User } from '../../entities/user.entity'

@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return user
  }
}
```

#### 基于角色的授权

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { Roles } from './decorators/roles.decorator'
import { UserRole } from '../../entities/user.entity'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles(UserRole.ADMIN)
  getAllUsers() {
    // 只有管理员可以访问此端点
    return 'Admin only content'
  }

  @Get('moderate')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  moderateContent() {
    // 管理员和版主可以访问此端点
    return 'Moderation content'
  }
}
```

### 用户角色

系统支持三种用户角色：

- **USER**：普通用户的默认角色
- **MODERATOR**：具有内容审核增强权限的角色
- **ADMIN**：拥有完整系统访问权限和用户管理权限的角色

### 守卫

#### JwtAuthGuard

验证JWT令牌并确保用户已认证。

#### RolesGuard

检查用户角色是否与端点所需权限匹配。

#### LocalAuthGuard

用于登录过程中的用户名/密码认证。

### 装饰器

#### @CurrentUser()

将当前认证用户注入到控制器方法中。

#### @Roles(...roles)

指定哪些角色可以访问某个端点。

## 安全特性

### 密码安全

- 使用bcrypt算法和盐值对密码进行哈希处理
- 从不存储明文密码

### 令牌安全

- JWT令牌使用密钥签名
- 令牌具有可配置的过期时间
- 刷新令牌允许扩展会话
- 令牌黑名单防止已登出令牌被重用

### 基于角色的访问控制

- 细粒度的权限系统
- 多个角色可以分配给同一个端点
- 分层角色检查

## 配置

设置以下环境变量：

```env
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d
```

## 测试

该模块包含全面的单元测试，涵盖：

- 认证服务方法
- 控制器端点
- 守卫功能
- 基于角色的访问控制

运行测试：

```bash
npm test -- --testPathPattern=auth
```

## 错误处理

系统处理各种错误场景：

- **401 Unauthorized**：无效凭证、令牌过期、用户未激活
- **403 Forbidden**：基于角色的端点权限不足
- **409 Conflict**：使用已存在的邮箱注册用户

所有错误均返回结构化JSON响应，并带有适当的HTTP状态码。