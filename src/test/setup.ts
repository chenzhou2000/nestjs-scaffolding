import { Test, TestingModule } from '@nestjs/testing'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'

export const createTestingModule = async (imports: any[] = []) => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'],
      }),
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
        dropSchema: true,
      }),
      ...imports,
    ],
  })
}

// Global test utilities
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Mock data generators
export const generateRandomString = (length: number = 10): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const generateRandomEmail = (): string => {
  return `${generateRandomString(8)}@${generateRandomString(5)}.com`
}
