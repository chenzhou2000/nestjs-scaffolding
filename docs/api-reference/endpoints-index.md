# API 端点索引

## 概述

本文档提供了所有API端点的快速索引，按字母顺序排列，便于快速查找。

## 📋 完整端点列表

### A

#### /auth/*
- `POST /auth/login` - 用户登录 ([文档](./auth-api.md#2-用户登录))
- `POST /auth/logout` - 用户登出 ([文档](./auth-api.md#3-用户登出))
- `POST /auth/profile` - 获取用户资料 ([文档](./auth-api.md#5-获取用户资料))
- `POST /auth/refresh` - 刷新令牌 ([文档](./auth-api.md#4-刷新令牌))
- `POST /auth/register` - 用户注册 ([文档](./auth-api.md#1-用户注册))

### C

#### /cache/*
- `DELETE /cache` - 清空所有缓存 ([文档](./cache-api.md)) *(计划中)*
- `DELETE /cache/:key` - 删除缓存值 ([文档](./cache-api.md)) *(计划中)*
- `GET /cache/:key` - 获取缓存值 ([文档](./cache-api.md)) *(计划中)*
- `POST /cache` - 设置缓存值 ([文档](./cache-api.md)) *(计划中)*

### D

#### /demo/*
- `GET /demo/error-handling/business-error` - 业务异常演示 ([文档](./error-demo-api.md)) *(计划中)*
- `GET /demo/error-handling/circuit-breaker` - 熔断器演示 ([文档](./error-demo-api.md)) *(计划中)*
- `GET /demo/error-handling/external-service-error` - 外部服务异常演示 ([文档](./error-demo-api.md)) *(计划中)*
- `GET /demo/error-handling/validation-error` - 验证异常演示 ([文档](./error-demo-api.md)) *(计划中)*

### G

#### /grpc-demo/*
- `POST /grpc-demo/notification/send` - 发送通知(gRPC) ([文档](./grpc-demo-api.md)) *(计划中)*
- `POST /grpc-demo/user/create` - 创建用户(gRPC) ([文档](./grpc-demo-api.md)) *(计划中)*
- `GET /grpc-demo/user/:id` - 获取用户(gRPC) ([文档](./grpc-demo-api.md)) *(计划中)*

### H

#### /health/*
- `GET /health` - 系统健康状态 ([文档](./health-api.md)) *(计划中)*
- `GET /health/database` - 数据库连接状态 ([文档](./health-api.md)) *(计划中)*
- `GET /health/rabbitmq` - RabbitMQ连接状态 ([文档](./health-api.md)) *(计划中)*
- `GET /health/redis` - Redis连接状态 ([文档](./health-api.md)) *(计划中)*

### L

#### /logs/*
- `GET /logs` - 查询日志记录 ([文档](./logs-api.md)) *(计划中)*
- `GET /logs/search` - 搜索日志内容 ([文档](./logs-api.md)) *(计划中)*
- `GET /logs/stats` - 获取日志统计 ([文档](./logs-api.md)) *(计划中)*

### U

#### /users/*
- `DELETE /users/:id` - 删除用户 ([文档](./users-api.md)) *(计划中)*
- `GET /users` - 获取用户列表 ([文档](./users-api.md)) *(计划中)*
- `GET /users/:id` - 获取用户详情 ([文档](./users-api.md)) *(计划中)*
- `PATCH /users/:id` - 更新用户信息 ([文档](./users-api.md)) *(计划中)*
- `POST /users` - 创建用户 ([文档](./users-api.md)) *(计划中)*

## 🔍 按功能分组

### 认证相关 (5个端点)
```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/profile
```

### 用户管理 (5个端点)
```
GET /users
GET /users/:id
POST /users
PATCH /users/:id
DELETE /users/:id
```

### 缓存管理 (4个端点)
```
GET /cache/:key
POST /cache
DELETE /cache/:key
DELETE /cache
```

### 系统监控 (7个端点)
```
GET /health
GET /health/database
GET /health/redis
GET /health/rabbitmq
GET /logs
GET /logs/search
GET /logs/stats
```

### 开发工具 (7个端点)
```
GET /demo/error-handling/business-error
GET /demo/error-handling/validation-error
GET /demo/error-handling/external-service-error
GET /demo/error-handling/circuit-breaker
POST /grpc-demo/user/create
GET /grpc-demo/user/:id
POST /grpc-demo/notification/send
```

## 📊 统计信息

### 按HTTP方法统计
- **GET**: 12个端点 (43%)
- **POST**: 10个端点 (36%)
- **DELETE**: 3个端点 (11%)
- **PATCH**: 3个端点 (11%)

### 按认证要求统计
- **无需认证**: 9个端点 (32%)
- **需要登录**: 8个端点 (29%)
- **仅管理员**: 11个端点 (39%)

### 按实现状态统计
- **已实现**: 5个端点 (18%)
- **计划中**: 23个端点 (82%)

## 🔗 相关文档

- [API参考文档主页](./README.md)
- [API搜索和导航指南](./api-search-guide.md)
- [认证API详细文档](./auth-api.md)

---

**最后更新**: 2024年12月24日  
**总端点数**: 28个  
**已实现端点**: 5个