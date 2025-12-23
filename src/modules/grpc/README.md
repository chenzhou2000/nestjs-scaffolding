# gRPC微服务模块

本模块实现了基于gRPC的微服务架构，包括用户服务和通知服务。

## 功能特性

### 用户微服务 (UserService)
- 创建、查询、更新、删除用户
- 用户列表查询（支持分页和搜索）
- 用户数据流式传输

### 通知微服务 (NotificationService)
- 发送通知
- 查询用户通知（支持分页和过滤）
- 标记通知为已读
- 删除通知
- 实时通知流订阅

## 架构组件

### Protocol Buffer定义
- `src/proto/user.proto` - 用户服务接口定义
- `src/proto/notification.proto` - 通知服务接口定义

### 服务实现
- `GrpcUserService` - 用户gRPC服务实现
- `GrpcNotificationService` - 通知gRPC服务实现
- `GrpcClientService` - gRPC客户端服务

### 控制器
- `GrpcUserController` - 用户gRPC控制器
- `GrpcNotificationController` - 通知gRPC控制器
- `GrpcDemoController` - REST API演示控制器

## 使用方法

### 启动gRPC服务器
```bash
# 开发模式
npm run start:grpc:dev

# 生产模式
npm run start:grpc
```

### 服务端口
- 用户服务: `localhost:50051`
- 通知服务: `localhost:50052`

### REST API演示端点

#### 用户管理
- `GET /grpc-demo/users/:id` - 获取用户
- `POST /grpc-demo/users` - 创建用户
- `PUT /grpc-demo/users/:id` - 更新用户
- `DELETE /grpc-demo/users/:id` - 删除用户
- `GET /grpc-demo/users` - 用户列表
- `GET /grpc-demo/users/stream` - 用户数据流 (SSE)

#### 通知管理
- `POST /grpc-demo/notifications` - 发送通知
- `GET /grpc-demo/notifications/:userId` - 获取用户通知
- `PUT /grpc-demo/notifications/:notificationId/read` - 标记为已读
- `DELETE /grpc-demo/notifications/:notificationId` - 删除通知
- `GET /grpc-demo/notifications/:userId/stream` - 通知流 (SSE)

## 环境变量

```bash
# gRPC服务地址
GRPC_USER_SERVICE_URL=localhost:50051
GRPC_NOTIFICATION_SERVICE_URL=localhost:50052
```

## 示例用法

### 创建用户
```bash
curl -X POST http://localhost:3000/grpc-demo/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": 0
  }'
```

### 发送通知
```bash
curl -X POST http://localhost:3000/grpc-demo/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user-id",
    "title": "Welcome",
    "message": "Welcome to our platform!",
    "type": 0
  }'
```

### 订阅通知流
```bash
curl -N http://localhost:3000/grpc-demo/notifications/user-id/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 技术特点

1. **Protocol Buffers**: 高效的序列化格式
2. **双向流通信**: 支持实时数据流
3. **类型安全**: TypeScript接口定义
4. **错误处理**: 完整的gRPC错误处理机制
5. **日志记录**: 详细的操作日志
6. **REST集成**: 通过REST API展示gRPC功能

## 测试

模块包含完整的单元测试和属性测试，验证：
- gRPC服务启动和连接
- 数据序列化和反序列化
- 错误处理机制
- 流式通信功能