# 认证模块 API 参考

## 概述

认证模块提供了完整的用户认证和授权API，包括用户注册、登录、登出、令牌刷新和用户资料获取功能。所有API都遵循RESTful设计原则，使用JSON格式进行数据交换。

## 基础信息

- **基础URL**: `/auth`
- **内容类型**: `application/json`
- **认证方式**: Bearer Token (JWT)
- **字符编码**: UTF-8

## 数据类型定义

### 用户角色枚举

```typescript
enum UserRole {
  USER = 'user',        // 普通用户
  MODERATOR = 'moderator', // 版主
  ADMIN = 'admin'       // 管理员
}
```

### 通用响应格式

```typescript
interface ApiResponse<T> {
  data?: T;              // 成功时的数据
  message?: string;      // 响应消息
  statusCode: number;    // HTTP状态码
  timestamp: string;     // 响应时间戳
  path: string;         // 请求路径
}

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
```

## API 端点详情

### 1. 用户注册

创建新的用户账户。

#### 请求信息

- **URL**: `POST /auth/register`
- **认证**: 无需认证
- **内容类型**: `application/json`

#### 请求参数

```typescript
interface RegisterDto {
  email: string;        // 用户邮箱，必须唯一且符合邮箱格式
  password: string;     // 密码，最少6位字符
  firstName: string;    // 用户名字，不能为空
  lastName: string;     // 用户姓氏，不能为空
}
```

#### 请求示例

```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### 响应格式

**成功响应 (201 Created)**

```typescript
interface RegisterResponse {
  id: string;           // 用户唯一标识符 (UUID)
  email: string;        // 用户邮箱
  firstName: string;    // 用户名字
  lastName: string;     // 用户姓氏
  role: UserRole;       // 用户角色，默认为 'user'
  isActive: boolean;    // 账户激活状态，默认为 true
  createdAt: string;    // 账户创建时间 (ISO 8601)
  updatedAt: string;    // 账户更新时间 (ISO 8601)
}
```

#### 响应示例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "isActive": true,
  "createdAt": "2023-12-01T10:00:00.000Z",
  "updatedAt": "2023-12-01T10:00:00.000Z"
}
```

#### 错误响应

**409 Conflict - 邮箱已存在**

```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/register"
}
```

**400 Bad Request - 数据验证失败**

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters",
    "firstName should not be empty"
  ],
  "error": "Bad Request",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/register"
}
```

### 2. 用户登录

验证用户凭据并返回JWT令牌。

#### 请求信息

- **URL**: `POST /auth/login`
- **认证**: 无需认证
- **内容类型**: `application/json`

#### 请求参数

```typescript
interface LoginDto {
  email: string;        // 用户邮箱
  password: string;     // 用户密码
}
```

#### 请求示例

```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

#### 响应格式

**成功响应 (200 OK)**

```typescript
interface AuthResponseDto {
  accessToken: string;   // JWT访问令牌
  refreshToken: string;  // JWT刷新令牌
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  expiresIn: number;     // 访问令牌过期时间（秒）
}
```

#### 响应示例

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwic3ViIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwicm9sZSI6InVzZXIiLCJzZXNzaW9uSWQiOiJhYmNkZWZnaC0xMjM0LTU2NzgtOTBhYi1jZGVmZ2hpams5MDEiLCJpYXQiOjE3MDE0MjcyMDAsImV4cCI6MTcwMTQzMDgwMH0.example_signature",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwic3ViIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwicm9sZSI6InVzZXIiLCJzZXNzaW9uSWQiOiJhYmNkZWZnaC0xMjM0LTU2NzgtOTBhYi1jZGVmZ2hpams5MDEiLCJpYXQiOjE3MDE0MjcyMDAsImV4cCI6MTcwMjAzMjAwMH0.example_refresh_signature",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  },
  "expiresIn": 3600
}
```

#### 错误响应

**401 Unauthorized - 凭据无效**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/login"
}
```

**401 Unauthorized - 账户未激活**

```json
{
  "statusCode": 401,
  "message": "Account is deactivated",
  "error": "Unauthorized",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/login"
}
```

### 3. 用户登出

登出用户并撤销当前令牌。

#### 请求信息

- **URL**: `POST /auth/logout`
- **认证**: 需要Bearer Token
- **内容类型**: `application/json`

#### 请求头

```http
Authorization: Bearer <access_token>
```

#### 请求示例

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 响应格式

**成功响应 (200 OK)**

```typescript
interface LogoutResponse {
  message: string;
}
```

#### 响应示例

```json
{
  "message": "Successfully logged out"
}
```

#### 错误响应

**401 Unauthorized - 令牌无效或已过期**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/logout"
}
```

### 4. 刷新令牌

使用刷新令牌获取新的访问令牌。

#### 请求信息

- **URL**: `POST /auth/refresh`
- **认证**: 无需认证（使用刷新令牌）
- **内容类型**: `application/json`

#### 请求参数

```typescript
interface RefreshTokenDto {
  refreshToken: string;  // 有效的刷新令牌
}
```

#### 请求示例

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwic3ViIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIiwicm9sZSI6InVzZXIiLCJzZXNzaW9uSWQiOiJhYmNkZWZnaC0xMjM0LTU2NzgtOTBhYi1jZGVmZ2hpams5MDEiLCJpYXQiOjE3MDE0MjcyMDAsImV4cCI6MTcwMjAzMjAwMH0.example_refresh_signature"
}
```

#### 响应格式

**成功响应 (200 OK)**

```typescript
interface AuthResponseDto {
  accessToken: string;   // 新的JWT访问令牌
  refreshToken: string;  // 新的JWT刷新令牌
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  expiresIn: number;     // 访问令牌过期时间（秒）
}
```

#### 响应示例

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_access_token_payload.new_signature",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_refresh_token_payload.new_refresh_signature",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  },
  "expiresIn": 3600
}
```

#### 错误响应

**401 Unauthorized - 刷新令牌无效或已过期**

```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/refresh"
}
```

### 5. 获取用户资料

获取当前认证用户的详细信息。

#### 请求信息

- **URL**: `POST /auth/profile`
- **认证**: 需要Bearer Token
- **内容类型**: `application/json`

#### 请求头

```http
Authorization: Bearer <access_token>
```

#### 请求示例

```bash
curl -X POST http://localhost:3000/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 响应格式

**成功响应 (200 OK)**

```typescript
interface UserProfile {
  id: string;           // 用户唯一标识符
  email: string;        // 用户邮箱
  firstName: string;    // 用户名字
  lastName: string;     // 用户姓氏
  role: UserRole;       // 用户角色
  isActive: boolean;    // 账户激活状态
  createdAt: string;    // 账户创建时间
  updatedAt: string;    // 账户更新时间
}
```

#### 响应示例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "isActive": true,
  "createdAt": "2023-12-01T10:00:00.000Z",
  "updatedAt": "2023-12-01T10:00:00.000Z"
}
```

#### 错误响应

**401 Unauthorized - 令牌无效或已过期**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/profile"
}
```

## 状态码说明

### 成功状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 OK | 请求成功 | 登录、登出、刷新令牌、获取资料 |
| 201 Created | 资源创建成功 | 用户注册 |

### 客户端错误状态码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 400 Bad Request | 请求参数错误 | 数据验证失败、缺少必需参数 |
| 401 Unauthorized | 未授权访问 | 令牌无效、凭据错误、账户未激活 |
| 403 Forbidden | 禁止访问 | 权限不足 |
| 409 Conflict | 资源冲突 | 邮箱已存在 |
| 429 Too Many Requests | 请求过于频繁 | 触发速率限制 |

### 服务器错误状态码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 500 Internal Server Error | 服务器内部错误 | 数据库连接失败、未处理的异常 |
| 503 Service Unavailable | 服务不可用 | 服务器维护、依赖服务不可用 |

## 错误处理

### 错误响应格式

所有错误响应都遵循统一的格式：

```typescript
interface ErrorResponse {
  statusCode: number;    // HTTP状态码
  message: string | string[]; // 错误消息，可能是字符串或字符串数组
  error: string;         // 错误类型
  timestamp: string;     // 错误发生时间
  path: string;         // 请求路径
}
```

### 数据验证错误

当请求数据验证失败时，`message` 字段将包含详细的验证错误信息：

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters",
    "firstName should not be empty"
  ],
  "error": "Bad Request",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/register"
}
```

### 认证错误处理

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/login"
}
```

## 使用示例

### JavaScript/TypeScript 客户端

```typescript
class AuthApiClient {
  private baseUrl = 'http://localhost:3000/auth';
  private accessToken: string | null = null;

  async register(userData: RegisterDto): Promise<RegisterResponse> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }

  async login(credentials: LoginDto): Promise<AuthResponseDto> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    return data;
  }

  async logout(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    this.accessToken = null;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    return data;
  }

  async getProfile(): Promise<UserProfile> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${this.baseUrl}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }
}
```

### cURL 示例

#### 用户注册

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### 用户登录

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "securePassword123"
  }'
```

#### 获取用户资料

```bash
curl -X POST http://localhost:3000/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 刷新令牌

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### 用户登出

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 速率限制

为了防止滥用和保护系统安全，认证API实施了速率限制：

| 端点 | 限制 | 时间窗口 |
|------|------|----------|
| `/auth/login` | 5次尝试 | 15分钟 |
| `/auth/register` | 3次尝试 | 1小时 |
| `/auth/refresh` | 10次尝试 | 1小时 |
| 其他端点 | 100次请求 | 15分钟 |

当触发速率限制时，API将返回429状态码：

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "Too Many Requests",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/auth/login"
}
```

## 安全注意事项

1. **HTTPS使用**: 生产环境中必须使用HTTPS传输敏感数据
2. **令牌存储**: 访问令牌应存储在内存中，刷新令牌应存储在安全的HttpOnly Cookie中
3. **令牌过期**: 定期检查令牌过期时间并及时刷新
4. **错误处理**: 不要在客户端暴露详细的错误信息
5. **输入验证**: 始终验证和清理用户输入
6. **日志记录**: 记录认证事件但不记录敏感信息如密码

## 版本信息

- **API版本**: v1.0.0
- **最后更新**: 2023-12-01
- **兼容性**: NestJS 9.x+, Node.js 16.x+