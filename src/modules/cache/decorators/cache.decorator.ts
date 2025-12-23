import { SetMetadata } from '@nestjs/common'

export const CACHE_KEY_METADATA = 'cache:key'
export const CACHE_TTL_METADATA = 'cache:ttl'
export const CACHE_PREFIX_METADATA = 'cache:prefix'

export interface CacheDecoratorOptions {
  key?: string
  ttl?: number
  prefix?: string
}

/**
 * Cache decorator to automatically cache method results
 */
export const Cache = (options: CacheDecoratorOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, options.key || propertyKey)(target, propertyKey, descriptor)
    SetMetadata(CACHE_TTL_METADATA, options.ttl)(target, propertyKey, descriptor)
    SetMetadata(CACHE_PREFIX_METADATA, options.prefix)(target, propertyKey, descriptor)
    return descriptor
  }
}

/**
 * Cache key decorator for method parameters
 */
export const CacheKey = (key?: string) => {
  return SetMetadata('cache:param:key', key)
}