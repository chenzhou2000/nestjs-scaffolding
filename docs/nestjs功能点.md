# NestJS 功能点

## 1. 核心基础 (Core Concepts)

- Modules (模块)：代码组织的基本单元，用于隔离和封装功能。|应用组织单元，使用 @Module() 装饰器，管理导入、导出、提供者等。
- Controllers (控制器)：处理传入的 HTTP 请求并返回响应。|处理 HTTP 请求，使用 @Controller() 和路由装饰器（如 @Get()、@Post()）。
- Providers & Services (提供者与服务)：承载业务逻辑，通过 依赖注入 (DI) 在组件间共享。
  - 提供者（Providers）：主要指 Services，使用 @Injectable()，负责业务逻辑。
- Dependency Injection (依赖注入)：NestJS 的核心设计模式，用于解耦组件。|Nest 内置强大的 DI 系统，自动注入服务。
- 装饰器（Decorators）：TypeScript 核心，如 @Injectable()、@Body()、@Param() 等参数装饰器。

## 2. AOP 面向切面编程 (Request Lifecycle)

NestJS 提供了精细的请求生命周期控制钩子，这是其强大的原因：

- Middleware (中间件)：在路由处理器之前执行，常用于日志记录或请求预处理。|类似 Express 中间件，用于日志、CORS 等。
- Guards (守卫)：用于权限验证（如 JWT 验证、RBAC 角色控制）。|权限控制，使用 @UseGuards()，实现认证/授权。
- Pipes (管道)：用于数据验证和数据转换（常配合 class-validator 使用）。|数据转换和验证（如 ValidationPipe、ParseIntPipe）。
- Interceptors (拦截器)：在函数执行前后绑定额外逻辑（如格式化返回数据、缓存、超时控制）。|前后置处理请求/响应（如日志、缓存、转换响应）。
- Exception Filters (异常过滤器)：全局捕获并自定义错误响应格式。|统一处理异常，使用 @Catch() 捕获错误。

## 3. 请求生命周期 (AOP 执行顺序)

理解顺序对调试至关重要：
1.收到请求
2. Middleware (中间件)：预处理请求（如日志、Body 解析）。
3. Guards (守卫)：验证权限（如 JWT, RBAC）。
4. Interceptors (拦截器) - 前置：转换数据流。
5. Pipes (管道)：验证和转换输入数据 (DTO)。
6. Controller / Service：执行业务逻辑。
7. Interceptors (拦截器) - 后置：包装响应数据。
8. Exception Filters (异常过滤器)：捕获错误并格式化输出。
9. 发送响应

## 4. 数据与安全 (Data & Security)

- ORM 整合：支持 TypeORM、Prisma 或 Mongoose (MongoDB)。
- DTO (Data Transfer Object)：定义请求数据的形状，并进行类型安全检查。
- Authentication (认证)：通常集成 Passport 库实现 JWT 或 OAuth。
- Configuration (配置管理)：使用 @nestjs/config 管理 .env 环境变量。

## 5. 常用实用特性

- 配置管理（ConfigModule）：环境变量、.env 文件加载、验证。
- 验证与转换：结合 class-validator 和 class-transformer 实现 DTO 验证。
- 日志（Logger）：内置日志系统，支持自定义。
- 自定义提供者：Factory、Async、动态提供者等高级用法。
- 全局作用域：全局模块、管道、守卫、拦截器。

## 6. 高级主题

- 微服务（Microservices）：支持 TCP、Redis、MQTT、gRPC 等传输器，构建分布式系统。
- GraphQL：内置支持 Apollo，快速构建 GraphQL API（Resolvers、Schema 等）。
- WebSockets：使用 @WebSocketGateway() 实现实时通信。
- CQRS：命令查询职责分离模式。
- 事件与消息队列：EventEmitter、消息模式。


## 7. 生态与集成

- 数据库：常用 ORM/ODM，如 TypeORM、Prisma、Sequelize、Mongoose。
- 认证授权：Passport 集成、JWT、OAuth 等策略。
- API 文档：Swagger/OpenAPI 模块自动生成文档。
- 测试：内置 Jest 支持，单元测试、e2e 测试。
- 其他：缓存（CacheModule）、序列化、文件上传、率限、国际化等。

