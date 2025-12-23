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
      // Try to get from cache first
      const cachedResult = await this.cacheService.get(fullCacheKey, cachePrefix)
      
      if (cachedResult !== null) {
        this.logger.debug(`Cache hit: ${fullCacheKey}`)
        return of(cachedResult)
      }

      this.logger.debug(`Cache miss: ${fullCacheKey}`)

      // If not in cache, execute the method and cache the result
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
    // Build cache key based on request parameters
    const params = request.params || {}
    const query = request.query || {}
    const user = request.user || {}

    const keyParts = [baseKey]

    // Add user ID if available
    if (user.id) {
      keyParts.push(`user:${user.id}`)
    }

    // Add route parameters
    Object.keys(params).forEach(key => {
      keyParts.push(`${key}:${params[key]}`)
    })

    // Add query parameters (sorted for consistency)
    const sortedQueryKeys = Object.keys(query).sort()
    sortedQueryKeys.forEach(key => {
      keyParts.push(`${key}:${query[key]}`)
    })

    return keyParts.join(':')
  }
}