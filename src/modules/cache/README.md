# Redis缓存集成

本模块为NestJS学习API项目提供全面的Redis缓存功能。

## 已实现功能

### 1. 缓存服务 (`CacheService`)
- **基础操作**: get, set, delete, exists, flush
- **高级操作**: mget, mset, incr, decr, expire, keys
- **前缀支持**: 可配置前缀的自动键前缀
- **TTL管理**: 缓存数据的可配置生存时间
- **错误处理**: 优雅的错误处理和日志记录
- **JSON序列化**: 自动JSON序列化/反序列化

### 2. 会话服务 (`SessionService`)
- **会话管理**: 创建、检索、更新和销毁用户会话
- **活动跟踪**: 更新最后活动时间戳，支持滑动过期
- **用户会话管理**: 获取和销毁特定用户的所有会话
- **令牌黑名单**: JWT令牌黑名单管理，支持自动过期
- **会话统计**: 获取全面的会话和黑名单统计信息
- **会话清理**: 手动清理过期会话

### 3. 缓存模块 (`CacheModule`)
- **全局模块**: 在整个应用程序中可用
- **Redis客户端工厂**: 可配置的Redis连接，支持错误处理
- **开发模式**: Redis不可用时的优雅降级
- **连接事件**: 正确的连接事件处理和日志记录

### 4. 缓存拦截器 (`CacheInterceptor`)
- **自动缓存**: 使用装饰器的方法级缓存
- **动态键生成**: 基于请求参数的智能缓存键生成
- **用户感知缓存**: 在缓存键中包含用户上下文
- **查询参数支持**: 在缓存键中包含查询参数

### 5. 缓存装饰器 (`@Cache`)
- **方法装饰**: 易于使用的方法缓存装饰器
- **可配置选项**: 自定义缓存键、TTL和前缀
- **基于参数的键**: 支持基于参数的缓存键生成

### 6. 缓存控制器 (`CacheController`)
- **管理端点**: 缓存管理的管理端点
- **统计信息**: 获取缓存和会话统计信息
- **缓存管理**: 刷新缓存、删除特定键、检查键存在性
- **会话清理**: 手动会话清理端点

## 与用户模块的集成

缓存模块与用户模块完全集成：

- **用户缓存**: 用户按ID和邮箱自动缓存
- **列表缓存**: 用户列表查询使用查询特定键缓存
- **缓存失效**: 用户更新/删除时正确失效缓存
- **性能优化**: 减少频繁访问用户的数据库查询

## 配置

Redis配置通过环境变量管理：

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 测试

全面的测试覆盖包括：

### 单元测试
- **缓存服务测试**: 所有基础和高级操作
- **会话服务测试**: 会话管理、令牌黑名单、统计信息
- **错误处理测试**: Redis连接失败和错误场景

### 基于属性的测试
- **缓存一致性**: 验证缓存一致性机制（属性6）
- **会话存储**: 验证会话存储功能（属性7）
- **令牌黑名单**: 验证JWT令牌生命周期管理（属性4）

## 使用示例

### 基础缓存
```typescript
// 注入缓存服务
constructor(private readonly cacheService: CacheService) {}

// 缓存数据
await this.cacheService.set('user:123', userData, { ttl: 300 })

// 检索数据
const user = await this.cacheService.get('user:123')
```

### 会话管理
```typescript
// 注入会话服务
constructor(private readonly sessionService: SessionService) {}

// 创建会话
await this.sessionService.createSession(sessionId, sessionData)

// 获取会话
const session = await this.sessionService.getSession(sessionId)

// 黑名单令牌
await this.sessionService.blacklistToken(tokenId, expirationTime)
```

### 方法级缓存
```typescript
@Cache({ key: 'users', ttl: 300, prefix: 'api' })
async getUsers() {
  // 此方法结果将自动缓存
  return await this.userRepository.find()
}
```

## 性能优势

- **减少数据库负载**: 频繁访问的数据从Redis提供
- **改善响应时间**: 缓存命中比数据库查询快得多
- **会话可扩展性**: 基于Redis的会话支持水平扩展
- **高效内存使用**: 基于TTL的过期防止内存膨胀

## 错误处理

- **优雅降级**: Redis不可用时应用程序继续工作
- **连接重试**: 可配置延迟的自动连接重试
- **全面日志**: 详细的错误日志用于调试
- **回退策略**: 缓存未命中时回退到数据库查询

## 满足的需求

此实现满足以下需求：

- **4.1**: 缓存一致性机制 - 数据正确缓存和失效
- **4.2**: 缓存未命中处理 - 缓存未命中时回退到数据库
- **4.3**: 数据更新同步 - 数据更新时清除缓存
- **4.5**: 会话存储功能 - Redis中的完整会话管理

Redis缓存集成现已完全实现和测试，为NestJS学习API项目提供了强大的缓存层。