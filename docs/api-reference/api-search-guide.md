# API 搜索和导航指南

## 概述

本指南帮助您快速找到所需的API端点和相关文档。我们提供了多种搜索和导航方式，让您能够高效地查找和使用API。

## 🔍 搜索方式

### 1. 按功能分类搜索

#### 用户相关功能
- **认证和授权**: [认证API](./auth-api.md)
- **用户管理**: [用户管理API](./users-api.md) *(计划中)*
- **用户资料**: 查看认证API中的 `/auth/profile` 端点

#### 数据管理功能
- **缓存操作**: [缓存API](./cache-api.md) *(计划中)*
- **日志查询**: [日志API](./logs-api.md) *(计划中)*
- **数据库健康检查**: [健康检查API](./health-api.md) *(计划中)*

#### 系统监控功能
- **应用健康状态**: [健康检查API](./health-api.md) *(计划中)*
- **错误处理演示**: [错误演示API](./error-demo-api.md) *(计划中)*
- **性能监控**: 查看日志API中的性能相关端点

#### 高级功能
- **微服务通信**: [gRPC演示API](./grpc-demo-api.md) *(计划中)*
- **异步处理**: 消息队列API *(计划中)*

### 2. 按HTTP方法搜索

#### GET 请求（查询数据）
| 端点 | 功能 | 文档链接 |
|------|------|----------|
| `GET /users` | 获取用户列表 | [用户管理API](./users-api.md) |
| `GET /users/:id` | 获取用户详情 | [用户管理API](./users-api.md) |
| `GET /cache/:key` | 获取缓存值 | [缓存API](./cache-api.md) |
| `GET /logs` | 查询日志记录 | [日志API](./logs-api.md) |
| `GET /health` | 系统健康状态 | [健康检查API](./health-api.md) |

#### POST 请求（创建/提交数据）
| 端点 | 功能 | 文档链接 |
|------|------|----------|
| `POST /auth/register` | 用户注册 | [认证API](./auth-api.md) |
| `POST /auth/login` | 用户登录 | [认证API](./auth-api.md) |
| `POST /auth/logout` | 用户登出 | [认证API](./auth-api.md) |
| `POST /users` | 创建用户 | [用户管理API](./users-api.md) |
| `POST /cache` | 设置缓存值 | [缓存API](./cache-api.md) |

#### PATCH/PUT 请求（更新数据）
| 端点 | 功能 | 文档链接 |
|------|------|----------|
| `PATCH /users/:id` | 更新用户信息 | [用户管理API](./users-api.md) |

#### DELETE 请求（删除数据）
| 端点 | 功能 | 文档链接 |
|------|------|----------|
| `DELETE /users/:id` | 删除用户 | [用户管理API](./users-api.md) |
| `DELETE /cache/:key` | 删除缓存值 | [缓存API](./cache-api.md) |
| `DELETE /cache` | 清空所有缓存 | [缓存API](./cache-api.md) |

### 3. 按权限要求搜索

#### 无需认证的端点
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/refresh` - 刷新令牌
- `GET /health/*` - 健康检查端点
- `GET /demo/error-handling/*` - 错误演示端点

#### 需要登录的端点（任何角色）
- `POST /auth/logout` - 用户登出
- `POST /auth/profile` - 获取用户资料
- `POST /grpc-demo/*` - gRPC演示端点

#### 仅管理员可访问的端点
- `GET /users` - 获取用户列表
- `POST /users` - 创建用户
- `PATCH /users/:id` - 更新用户信息
- `DELETE /users/:id` - 删除用户
- `GET /cache/*` - 缓存查询
- `POST /cache` - 设置缓存
- `DELETE /cache/*` - 删除缓存
- `GET /logs/*` - 日志查询

## 🏷 标签分类

### 按业务领域分类

#### 🔐 认证授权 (Authentication & Authorization)
- 用户注册和登录
- JWT令牌管理
- 权限验证
- 会话管理

**相关端点**: `/auth/*`  
**文档**: [认证API](./auth-api.md)

#### 👥 用户管理 (User Management)
- 用户CRUD操作
- 用户资料管理
- 用户权限管理

**相关端点**: `/users/*`  
**文档**: [用户管理API](./users-api.md) *(计划中)*

#### 💾 数据存储 (Data Storage)
- 缓存管理
- 数据持久化
- 数据查询

**相关端点**: `/cache/*`  
**文档**: [缓存API](./cache-api.md) *(计划中)*

#### 📊 监控日志 (Monitoring & Logging)
- 应用日志查询
- 系统监控
- 性能统计

**相关端点**: `/logs/*`, `/health/*`  
**文档**: [日志API](./logs-api.md), [健康检查API](./health-api.md) *(计划中)*

#### 🔧 开发工具 (Development Tools)
- 错误处理演示
- gRPC服务调用
- 开发调试

**相关端点**: `/demo/*`, `/grpc-demo/*`  
**文档**: [错误演示API](./error-demo-api.md), [gRPC演示API](./grpc-demo-api.md) *(计划中)*

### 按技术特性分类

#### 🚀 高性能 (High Performance)
- 缓存机制
- 异步处理
- 性能监控

#### 🛡 安全性 (Security)
- JWT认证
- 权限控制
- 输入验证

#### 🔄 可靠性 (Reliability)
- 错误处理
- 健康检查
- 熔断机制

#### 📡 通信协议 (Communication)
- RESTful API
- gRPC服务
- 消息队列

## 🎯 快速查找指南

### 我想要...

#### 实现用户认证
1. 查看 [认证API](./auth-api.md)
2. 重点关注：
   - `POST /auth/register` - 用户注册
   - `POST /auth/login` - 用户登录
   - `POST /auth/refresh` - 令牌刷新

#### 管理用户数据
1. 查看 [用户管理API](./users-api.md) *(计划中)*
2. 重点关注：
   - `GET /users` - 获取用户列表
   - `POST /users` - 创建用户
   - `PATCH /users/:id` - 更新用户

#### 实现缓存功能
1. 查看 [缓存API](./cache-api.md) *(计划中)*
2. 重点关注：
   - `GET /cache/:key` - 获取缓存
   - `POST /cache` - 设置缓存
   - `DELETE /cache/:key` - 删除缓存

#### 监控应用状态
1. 查看 [健康检查API](./health-api.md) *(计划中)*
2. 查看 [日志API](./logs-api.md) *(计划中)*
3. 重点关注：
   - `GET /health` - 系统状态
   - `GET /logs` - 日志查询

#### 处理错误和异常
1. 查看 [错误演示API](./error-demo-api.md) *(计划中)*
2. 查看各API文档中的"错误响应"部分
3. 重点关注：
   - 状态码说明
   - 错误响应格式
   - 错误处理最佳实践

#### 集成gRPC服务
1. 查看 [gRPC演示API](./grpc-demo-api.md) *(计划中)*
2. 重点关注：
   - gRPC服务调用
   - Protocol Buffers定义
   - 双向流通信

## 📖 文档阅读建议

### 新手开发者
1. **从认证开始**: 先阅读 [认证API](./auth-api.md) 了解基础认证流程
2. **理解权限模型**: 学习用户角色和权限矩阵
3. **掌握错误处理**: 了解通用错误响应格式和状态码
4. **实践基础操作**: 尝试用户注册、登录、获取资料等基础功能

### 有经验的开发者
1. **快速浏览**: 查看 [API索引](./README.md) 了解所有可用端点
2. **重点关注**: 查看具体业务模块的API文档
3. **集成测试**: 使用Postman集合或Swagger文档进行API测试
4. **性能优化**: 关注缓存API和监控API的使用

### 系统架构师
1. **整体架构**: 了解API的整体设计和分层结构
2. **安全机制**: 重点关注认证、授权和安全相关的设计
3. **监控体系**: 了解健康检查、日志和监控相关的API
4. **扩展性**: 关注gRPC和消息队列等高级功能

## 🔗 相关资源链接

### 开发工具
- [Postman集合](./postman/) *(计划中)*
- [Swagger文档](http://localhost:3000/api-docs) *(开发环境)*
- [API测试工具](../guides/api-testing-guide.md) *(计划中)*

### 学习资源
- [API设计最佳实践](../guides/api-design-best-practices.md) *(计划中)*
- [认证和授权指南](../guides/auth-guide.md) *(计划中)*
- [错误处理指南](../guides/error-handling-guide.md) *(计划中)*

### 代码示例
- [JavaScript/TypeScript客户端](../examples/api-client-examples.md) *(计划中)*
- [cURL命令示例](../examples/curl-examples.md) *(计划中)*
- [Python客户端示例](../examples/python-client-examples.md) *(计划中)*

---

**提示**: 如果您找不到所需的API端点或文档，请检查该功能是否已实现。标记为"*(计划中)*"的文档表示功能正在开发中。