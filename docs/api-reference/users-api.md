# 用户管理 API 参考

## 概述

用户管理API提供了完整的用户CRUD操作功能，包括用户创建、查询、更新和删除。所有端点都需要JWT认证，并实施了基于角色的权限控制。

## 基础信息

- **基础路径**: `/users`
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`

## 权限要求

| 端点 | 用户角色 | 管理员角色 | 版主角色 |
|------|----------|------------|----------|
| GET /users | ❌ | ✅ | ✅ |
| GET /users/:id | ❌ | ✅ | ✅ |
| GET /users/me | ✅ | ✅ | ✅ |
| POST /users | ❌ | ✅ | ❌ |
| PATCH /users/:id | ❌ | ✅ | ❌ |
| PATCH /users/me | ✅ | ✅ | ✅ |
| DELETE /users/:id | ❌ | ✅ | ❌ |

## API 端点

### 1. 获取用户列表

获取系统中所有用户的分页列表。

**端点**: `GET /users`  
**权限**: 管理员或版主

#### 请求参数

**查询参数**:
```typescript
interface QueryUserDto {
  page?: number;        // 页码，默认1
  limit?: number;       // 每页记录数，默认10，最大100
  sortBy?: string;      // 排序字段，默认'createdAt'
  sortOrder?: 'ASC' | 'DESC'; // 排序方向，默认'DESC'
  search?: string;      // 搜索关键词（姓名、邮箱）
  role?: 'user' | 'moderator' | 'admin'; // 按角色过滤
  isActive?: boolean;   // 按激活状态过滤
}
```

#### 请求示例

```bash
curl -X GET "http://localhost:3000/users?page=1&limit=10&search=john&role=user" \
  -H "Authorization: Bearer <your_token>"
```

#### 响应格式

**成功响应 (200)**:
```json
{
  "data": [
    {
      "id": "uuid-string",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### 2. 获取用户详情

根据用户ID获取特定用户的详细信息。

**端点**: `GET /users/:id`  
**权限**: 管理员或版主

#### 路径参数

- `id` (string, required): 用户UUID

#### 请求示例

```bash
curl -X GET "http://localhost:3000/users/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <your_token>"
```

#### 响应格式

**成功响应 (200)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**错误响应 (404)**:
```json
{
  "statusCode": 404,
  "message": "User with ID 123e4567-e89b-12d3-a456-426614174000 not found",
  "error": "Not Found",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/users/123e4567-e89b-12d3-a456-426614174000"
}
```

### 3. 获取当前用户资料

获取当前登录用户的个人资料信息。

**端点**: `GET /users/me`  
**权限**: 任何已认证用户

#### 请求示例

```bash
curl -X GET "http://localhost:3000/users/me" \
  -H "Authorization: Bearer <your_token>"
```

#### 响应格式

**成功响应 (200)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 4. 创建用户

创建新的用户账户。

**端点**: `POST /users`  
**权限**: 仅管理员

#### 请求体

```typescript
interface CreateUserDto {
  email: string;        // 邮箱地址，必须唯一
  password: string;     // 密码，最少8位
  firstName: string;    // 名字
  lastName: string;     // 姓氏
  role?: 'user' | 'moderator' | 'admin'; // 用户角色，默认'user'
  isActive?: boolean;   // 激活状态，默认true
}
```

#### 请求示例

```bash
curl -X POST "http://localhost:3000/users" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securepassword123",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "user"
  }'
```

#### 响应格式

**成功响应 (201)**:
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**错误响应 (409)**:
```json
{
  "statusCode": 409,
  "message": "User with email newuser@example.com already exists",
  "error": "Conflict",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/users"
}
```

### 5. 更新用户信息

更新指定用户的信息。

**端点**: `PATCH /users/:id`  
**权限**: 仅管理员

#### 路径参数

- `id` (string, required): 用户UUID

#### 请求体

```typescript
interface UpdateUserDto {
  email?: string;       // 邮箱地址
  firstName?: string;   // 名字
  lastName?: string;    // 姓氏
  role?: 'user' | 'moderator' | 'admin'; // 用户角色
  isActive?: boolean;   // 激活状态
}
```

#### 请求示例

```bash
curl -X PATCH "http://localhost:3000/users/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "UpdatedName",
    "role": "moderator"
  }'
```

#### 响应格式

**成功响应 (200)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "firstName": "UpdatedName",
  "lastName": "Doe",
  "role": "moderator",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

### 6. 更新当前用户资料

更新当前登录用户的个人资料。

**端点**: `PATCH /users/me`  
**权限**: 任何已认证用户

#### 请求体

```typescript
interface UpdateProfileDto {
  firstName?: string;   // 名字
  lastName?: string;    // 姓氏
  // 注意：用户不能修改自己的邮箱、角色或激活状态
}
```

#### 请求示例

```bash
curl -X PATCH "http://localhost:3000/users/me" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "UpdatedFirstName",
    "lastName": "UpdatedLastName"
  }'
```

#### 响应格式

**成功响应 (200)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "firstName": "UpdatedFirstName",
  "lastName": "UpdatedLastName",
  "role": "user",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T01:00:00.000Z"
}
```

### 7. 删除用户

删除指定的用户账户。

**端点**: `DELETE /users/:id`  
**权限**: 仅管理员

#### 路径参数

- `id` (string, required): 用户UUID

#### 请求示例

```bash
curl -X DELETE "http://localhost:3000/users/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <your_token>"
```

#### 响应格式

**成功响应 (204)**:
```
无响应体
```

**错误响应 (404)**:
```json
{
  "statusCode": 404,
  "message": "User with ID 123e4567-e89b-12d3-a456-426614174000 not found",
  "error": "Not Found",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/users/123e4567-e89b-12d3-a456-426614174000"
}
```

## 数据模型

### UserResponseDto

```typescript
interface UserResponseDto {
  id: string;           // 用户UUID
  email: string;        // 邮箱地址
  firstName: string;    // 名字
  lastName: string;     // 姓氏
  role: UserRole;       // 用户角色
  isActive: boolean;    // 激活状态
  createdAt: Date;      // 创建时间
  updatedAt: Date;      // 更新时间
}
```

### UserRole 枚举

```typescript
enum UserRole {
  USER = 'user',        // 普通用户
  MODERATOR = 'moderator', // 版主
  ADMIN = 'admin'       // 管理员
}
```

## 错误处理

### 常见错误码

| 状态码 | 错误类型 | 描述 | 解决方案 |
|--------|----------|------|----------|
| 400 | Bad Request | 请求参数无效 | 检查请求参数格式和类型 |
| 401 | Unauthorized | 未提供有效的认证令牌 | 提供有效的JWT令牌 |
| 403 | Forbidden | 权限不足 | 确保用户具有所需权限 |
| 404 | Not Found | 用户不存在 | 检查用户ID是否正确 |
| 409 | Conflict | 邮箱已存在 | 使用不同的邮箱地址 |
| 422 | Unprocessable Entity | 数据验证失败 | 检查请求数据格式 |

### 验证错误示例

```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be longer than or equal to 8 characters",
    "firstName should not be empty"
  ],
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/users"
}
```

## 使用示例

### JavaScript/TypeScript 客户端

```typescript
class UsersApiClient {
  private baseUrl = 'http://localhost:3000';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async getUsers(params?: QueryUserDto) {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    const url = `${this.baseUrl}/users${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async createUser(userData: CreateUserDto) {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async updateUser(id: string, userData: UpdateUserDto) {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async deleteUser(id: string) {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
}

// 使用示例
const client = new UsersApiClient('your-jwt-token');

// 获取用户列表
const users = await client.getUsers({ page: 1, limit: 10, role: 'user' });

// 创建用户
const newUser = await client.createUser({
  email: 'test@example.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User',
  role: 'user'
});
```

## 最佳实践

### 1. 分页查询优化

```typescript
// 推荐：使用合理的分页参数
const users = await fetch('/users?page=1&limit=20&sortBy=createdAt&sortOrder=DESC');

// 避免：请求过多数据
// const users = await fetch('/users?limit=1000'); // 不推荐
```

### 2. 错误处理

```typescript
async function handleUserOperation() {
  try {
    const user = await client.getUser(userId);
    return user;
  } catch (error) {
    if (error.status === 404) {
      console.log('用户不存在');
    } else if (error.status === 403) {
      console.log('权限不足');
    } else {
      console.log('操作失败:', error.message);
    }
  }
}
```

### 3. 数据验证

```typescript
// 客户端验证示例
function validateUserData(userData: CreateUserDto): string[] {
  const errors: string[] = [];
  
  if (!userData.email || !/\S+@\S+\.\S+/.test(userData.email)) {
    errors.push('邮箱格式无效');
  }
  
  if (!userData.password || userData.password.length < 8) {
    errors.push('密码至少需要8位字符');
  }
  
  if (!userData.firstName?.trim()) {
    errors.push('名字不能为空');
  }
  
  return errors;
}
```

## 相关文档

- [认证API参考](./auth-api.md) - 了解如何获取访问令牌
- [用户管理模块文档](../modules/users.md) - 详细的模块实现说明
- [权限控制指南](../guides/authorization-guide.md) - 权限系统详解 *(计划中)*

---

**最后更新**: 2024年12月24日  
**API版本**: v1.0.0