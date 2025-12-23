import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators'
import { CacheService } from '../cache.service'
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_PREFIX_METADATA,
} from '../decorators/cache.decorator'

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name)

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    )
    const cacheTTL = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    )
    const cachePrefix = this.reflector.get<string>(
      CACHE_PREFIX_METADATA,
      context.getHandler(),
    )

    if (!cacheKey) {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest()
    const fullCacheKey = this.buildCacheKey(cacheKey, request)

    try {
      // 首先尝试从缓存获取
      const cachedResult = await this.cacheService.get(fullCacheKey, cachePrefix)
      
      if (cachedResult !== null) {
        this.logger.debug(`Cache hit: ${fullCacheKey}`)
        return of(cachedResult)
      }

      this.logger.debug(`Cache miss: ${fullCacheKey}`)

      // 如果缓存中没有，执行方法并缓存结果
      return next.handle().pipe(
        tap(async (result) => {
          try {
            await this.cacheService.set(fullCacheKey, result, {
              ttl: cacheTTL,
              prefix: cachePrefix,
            })
            this.logger.debug(`Cached result: ${fullCacheKey}`)
          } catch (error) {
            this.logger.error(`Failed to cache result for ${fullCacheKey}:`, error)
          }
        }),
      )
    } catch (error) {
      this.logger.error(`Cache interceptor error for ${fullCacheKey}:`, error)
      return next.handle()
    }
  }

  private buildCacheKey(baseKey: string, request: any): string {
    // 基于请求参数构建缓存键
    const params = request.params || {}
    const query = request.query || {}
    const user = request.user || {}

    const keyParts = [baseKey]

    // 如果可用，添加用户ID
    if (user.id) {
      keyParts.push(`user:${user.id}`)
    }

    // 添加路由参数
    Object.keys(params).forEach(key => {
      keyParts.push(`${key}:${params[key]}`)
    })

    // 添加查询参数（排序以保持一致性）
    const sortedQueryKeys = Object.keys(query).sort()
    sortedQueryKeys.forEach(key => {
      keyParts.push(`${key}:${query[key]}`)
    })

    return keyParts.join(':')
  }
}