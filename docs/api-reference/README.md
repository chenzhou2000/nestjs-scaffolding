# API 参考文档

## 概述

本文档提供了NestJS学习API项目中所有可用API端点的完整参考。所有API都遵循RESTful设计原则，使用JSON格式进行数据交换，并实施了统一的认证和错误处理机制。

## 🔗 快速导航

### 📚 文档导航
- [API搜索和导航指南](./api-search-guide.md) - 快速找到所需的API端点
- [API端点索引](./endpoints-index.md) - 按字母顺序排列的完整端点列表
- [通用响应格式](#通用响应格式) - 了解API响应结构
- [认证和授权](#认证和授权) - 了解API安全机制
- [状态码参考](#状态码参考) - HTTP状态码说明

### 核心业务API
- [认证API](#认证api) - 用户注册、登录、权限管理
- [用户管理API](#用户管理api) - 用户CRUD操作、资料管理
- [缓存API](#缓存api) - 缓存管理和会话控制
- [日志API](#日志api) - 日志查询和监控

### 系统监控API
- [健康检查API](#健康检查api) - 系统状态监控
- [错误演示API](#错误演示api) - 错误处理演示

### 高级功能API
- [gRPC演示API](#grpc演示api) - gRPC服务调用演示

## 📋 API 分类索引

### 认证API
**基础路径**: `/auth`

| 方法 | 端点 | 描述 | 认证要求 |
|------|------|------|----------|
| POST | `/auth/register` | 用户注册 | 无 |
| POST | `/auth/login` | 用户登录 | 无 |
| POST | `/auth/logout` | 用户登出 | Bearer Token |
| POST | `/auth/refresh` | 刷新令牌 | Refresh Token |
| POST | `/auth/profile` | 获取用户资料 | Bearer Token |

**详细文档**: [认证API参考](./auth-api.md)

### 用户管理API
**基础路径**: `/users`

| 方法 | 端点 | 描述 | 认证要求 | 权限要求 |
|------|------|------|----------|----------|
| GET | `/users` | 获取用户列表 | Bearer Token | ADMIN |
| GET | `/users/:id` | 获取用户详情 | Bearer Token | ADMIN |
| POST | `/users` | 创建用户 | Bearer Token | ADMIN |
| PATCH | `/users/:id` | 更新用户信息 | Bearer Token | ADMIN |
| DELETE | `/users/:id` | 删除用户 | Bearer Token | ADMIN |

**详细文档**: [用户管理API参考](./users-api.md) *(计划中)*

### 缓存API
**基础路径**: `/cache`

| 方法 | 端点 | 描述 | 认证要求 | 权限要求 |
|------|------|------|----------|----------|
| GET | `/cache/:key` | 获取缓存值 | Bearer Token | ADMIN |
| POST | `/cache` | 设置缓存值 | Bearer Token | ADMIN |
| DELETE | `/cache/:key` | 删除缓存值 | Bearer Token | ADMIN |
| DELETE | `/cache` | 清空所有缓存 | Bearer Token | ADMIN |

**详细文档**: [缓存API参考](./cache-api.md) *(计划中)*

### 日志API
**基础路径**: `/logs`

| 方法 | 端点 | 描述 | 认证要求 | 权限要求 |
|------|------|------|----------|----------|
| GET | `/logs` | 查询日志记录 | Bearer Token | ADMIN |
| GET | `/logs/search` | 搜索日志内容 | Bearer Token | ADMIN |
| GET | `/logs/stats` | 获取日志统计 | Bearer Token | ADMIN |

**详细文档**: [日志API参考](./logs-api.md) *(计划中)*

### 健康检查API
**基础路径**: `/health`

| 方法 | 端点 | 描述 | 认证要求 |
|------|------|------|----------|
| GET | `/health` | 系统健康状态 | 无 |
| GET | `/health/database` | 数据库连接状态 | 无 |
| GET | `/health/redis` | Redis连接状态 | 无 |
| GET | `/health/rabbitmq` | RabbitMQ连接状态 | 无 |

**详细文档**: [健康检查API参考](./health-api.md) *(计划中)*

### 错误演示API
**基础路径**: `/demo/error-handling`

| 方法 | 端点 | 描述 | 认证要求 |
|------|------|------|----------|
| GET | `/demo/error-handling/business-error` | 业务异常演示 | 无 |
| GET | `/demo/error-handling/validation-error` | 验证异常演示 | 无 |
| GET | `/demo/error-handling/external-service-error` | 外部服务异常演示 | 无 |
| GET | `/demo/error-handling/circuit-breaker` | 熔断器演示 | 无 |

**详细文档**: [错误演示API参考](./error-demo-api.md) *(计划中)*

### gRPC演示API
**基础路径**: `/grpc-demo`

| 方法 | 端点 | 描述 | 认证要求 |
|------|------|------|----------|
| POST | `/grpc-demo/user/create` | 创建用户(gRPC) | Bearer Token |
| GET | `/grpc-demo/user/:id` | 获取用户(gRPC) | Bearer Token |
| POST | `/grpc-demo/notification/send` | 发送通知(gRPC) | Bearer Token |

**详细文档**: [gRPC演示API参考](./grpc-demo-api.md) *(计划中)*

## 🔐 认证和授权

### 认证方式

所有需要认证的API端点都使用JWT Bearer Token认证：

```http
Authorization: Bearer <your_jwt_token>
```

### 用户角色

系统定义了三种用户角色：

```typescript
enum UserRole {
  USER = 'user',        // 普通用户
  MODERATOR = 'moderator', // 版主  
  ADMIN = 'admin'       // 管理员
}
```

### 权限矩阵

| API分类 | USER | MODERATOR | ADMIN |
|---------|------|-----------|-------|
| 认证API | ✅ | ✅ | ✅ |
| 用户管理API | ❌ | ❌ | ✅ |
| 缓存API | ❌ | ❌ | ✅ |
| 日志API | ❌ | ❌ | ✅ |
| 健康检查API | ✅ | ✅ | ✅ |
| 错误演示API | ✅ | ✅ | ✅ |
| gRPC演示API | ✅ | ✅ | ✅ |

## 📊 通用响应格式

### 成功响应

```typescript
interface ApiResponse<T> {
  data?: T;              // 响应数据
  message?: string;      // 响应消息
  statusCode: number;    // HTTP状态码
  timestamp: string;     // 响应时间戳
  path: string;         // 请求路径
}
```

### 错误响应

```typescript
interface ErrorResponse {
  statusCode: number;    // HTTP状态码
  message: string | string[]; // 错误消息
  error: string;         // 错误类型
  timestamp: string;     // 错误时间戳
  path: string;         // 请求路径
}
```

### 分页响应

```typescript
interface PaginatedResponse<T> {
  data: T[];            // 数据列表
  total: number;        // 总记录数
  page: number;         // 当前页码
  limit: number;        // 每页记录数
  totalPages: number;   // 总页数
}
```

## 🚨 状态码参考

### 成功状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 OK | 请求成功 | 获取数据、更新操作 |
| 201 Created | 资源创建成功 | 创建用户、注册 |
| 204 No Content | 请求成功但无返回内容 | 删除操作 |

### 客户端错误状态码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 400 Bad Request | 请求参数错误 | 数据验证失败、参数缺失 |
| 401 Unauthorized | 未授权访问 | 令牌无效、未登录 |
| 403 Forbidden | 禁止访问 | 权限不足 |
| 404 Not Found | 资源不存在 | 用户不存在、端点不存在 |
| 409 Conflict | 资源冲突 | 邮箱已存在、重复创建 |
| 422 Unprocessable Entity | 实体无法处理 | 业务逻辑验证失败 |
| 429 Too Many Requests | 请求过于频繁 | 触发速率限制 |

### 服务器错误状态码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 500 Internal Server Error | 服务器内部错误 | 未处理的异常 |
| 502 Bad Gateway | 网关错误 | 上游服务不可用 |
| 503 Service Unavailable | 服务不可用 | 服务维护、依赖服务故障 |

## 🔧 请求和响应示例

### 通用请求头

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>  # 需要认证的端点
```

### 分页查询参数

```typescript
interface PaginationQuery {
  page?: number;        // 页码，默认1
  limit?: number;       // 每页记录数，默认10
  sortBy?: string;      // 排序字段
  sortOrder?: 'ASC' | 'DESC'; // 排序方向，默认ASC
}
```

### 搜索查询参数

```typescript
interface SearchQuery extends PaginationQuery {
  search?: string;      // 搜索关键词
  filter?: object;      // 过滤条件
}
```

## 🛠 开发工具和测试

### Postman集合

我们提供了完整的Postman集合，包含所有API端点的示例请求：

- [下载Postman集合](./postman/NestJS-Learning-API.postman_collection.json) *(计划中)*

### Swagger文档

在开发环境中，您可以通过以下地址访问交互式API文档：

- **本地开发**: `http://localhost:3000/api-docs`
- **Swagger JSON**: `http://localhost:3000/api-docs-json`

### 测试环境

| 环境 | 基础URL | 描述 |
|------|---------|------|
| 本地开发 | `http://localhost:3000` | 本地开发服务器 |
| 测试环境 | `https://api-test.example.com` | 测试环境 *(计划中)* |
| 生产环境 | `https://api.example.com` | 生产环境 *(计划中)* |

## 📝 使用指南

### 快速开始

1. **获取访问令牌**
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'
   ```

2. **使用令牌访问受保护的端点**
   ```bash
   curl -X GET http://localhost:3000/users \
     -H "Authorization: Bearer <your_token>"
   ```

3. **处理分页数据**
   ```bash
   curl -X GET "http://localhost:3000/users?page=1&limit=10&sortBy=createdAt&sortOrder=DESC" \
     -H "Authorization: Bearer <your_token>"
   ```

### 错误处理最佳实践

```typescript
async function apiCall() {
  try {
    const response = await fetch('/api/endpoint');
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 401:
          // 处理认证失败
          redirectToLogin();
          break;
        case 403:
          // 处理权限不足
          showPermissionError();
          break;
        case 429:
          // 处理速率限制
          showRateLimitError();
          break;
        default:
          // 处理其他错误
          showGenericError(error.message);
      }
      return;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // 处理网络错误
    showNetworkError();
  }
}
```

## 🔄 版本控制

### API版本策略

- **当前版本**: v1.0
- **版本控制方式**: URL路径版本控制（计划中）
- **向后兼容**: 保证同一主版本内的向后兼容性

### 版本更新日志

| 版本 | 发布日期 | 主要变更 |
|------|----------|----------|
| v1.0.0 | 2024-12-24 | 初始版本发布 |

## 📞 支持和反馈

### 问题报告

如果您在使用API时遇到问题，请：

1. 检查本文档中的相关说明
2. 查看错误响应中的详细信息
3. 提交Issue到项目仓库

### 功能请求

欢迎提交功能请求和改进建议到项目仓库的Issues页面。

### 联系方式

- **项目仓库**: [GitHub Repository](https://github.com/your-repo)
- **文档反馈**: 通过GitHub Issues提交
- **技术支持**: 查看项目README中的联系方式

---

**最后更新**: 2024年12月24日  
**文档版本**: v1.0.0  
**API版本**: v1.0.0