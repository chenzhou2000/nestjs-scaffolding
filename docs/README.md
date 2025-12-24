# NestJS 学习 API 文档

欢迎来到 NestJS 学习 API 项目文档！本文档将帮助您深入理解项目中各个功能模块的实现原理和使用方法。

## 📚 文档导航

### 功能模块文档
- [认证模块](./modules/auth.md) - JWT认证、角色权限控制
- [用户管理模块](./modules/users.md) - 用户CRUD操作、数据验证
- [缓存模块](./modules/cache.md) - Redis集成、缓存策略
- [消息队列模块](./modules/queue.md) - RabbitMQ异步处理
- [gRPC模块](./modules/grpc.md) - 微服务通信
- [文件处理模块](./modules/files.md) - 文件上传、存储、处理
- [日志监控模块](./modules/logging.md) - 应用监控、调试
- [数据库模块](./modules/database.md) - TypeORM、数据库操作
- [错误处理模块](./modules/error-handling.md) - 异常管理、系统稳定性
- [健康检查模块](./modules/health.md) - 应用监控、运维管理

### API 参考文档
- [认证 API](./api-reference/auth-api.md)
- [用户管理 API](./api-reference/users-api.md)
- [缓存 API](./api-reference/cache-api.md)
- [文件处理 API](./api-reference/files-api.md)
- [健康检查 API](./api-reference/health-api.md)

### 使用示例
- [认证示例](./examples/auth-examples.md)
- [缓存使用示例](./examples/cache-examples.md)
- [gRPC 通信示例](./examples/grpc-examples.md)
- [文件处理示例](./examples/files-examples.md)
- [消息队列示例](./examples/queue-examples.md)

### 指南文档
- [项目搭建指南](./guides/setup-guide.md)
- [测试指南](./guides/testing-guide.md)
- [部署指南](./guides/deployment-guide.md)
- [最佳实践](./guides/best-practices.md)

## 🚀 快速开始

1. **新手入门**: 建议从[项目搭建指南](./guides/setup-guide.md)开始
2. **功能学习**: 按需查看各个[功能模块文档](#功能模块文档)
3. **实践应用**: 参考[使用示例](#使用示例)进行实际开发
4. **深入理解**: 查看[API参考文档](#api-参考文档)了解详细接口

## 📖 学习路径推荐

### 初级开发者
1. [项目搭建指南](./guides/setup-guide.md)
2. [用户管理模块](./modules/users.md)
3. [认证模块](./modules/auth.md)
4. [数据库模块](./modules/database.md)

### 中级开发者
1. [缓存模块](./modules/cache.md)
2. [日志监控模块](./modules/logging.md)
3. [错误处理模块](./modules/error-handling.md)
4. [健康检查模块](./modules/health.md)

### 高级开发者
1. [消息队列模块](./modules/queue.md)
2. [gRPC模块](./modules/grpc.md)
3. [文件处理模块](./modules/files.md)
4. [最佳实践](./guides/best-practices.md)

## 🛠 技术栈

- **框架**: NestJS
- **数据库**: MySQL + TypeORM
- **缓存**: Redis
- **消息队列**: RabbitMQ
- **认证**: JWT
- **通信**: gRPC
- **日志**: Winston
- **测试**: Jest

## 📝 文档贡献

如果您发现文档中的错误或希望改进内容，欢迎提交 Issue 或 Pull Request。

## 📄 许可证

本项目采用 MIT 许可证。