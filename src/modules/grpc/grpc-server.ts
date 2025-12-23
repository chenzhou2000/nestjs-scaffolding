import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { GrpcModule } from './grpc.module';

async function bootstrap() {
  const logger = new Logger('GrpcServer');

  // Create User gRPC microservice
  const userApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    GrpcModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'user',
        protoPath: join(__dirname, '../../proto/user.proto'),
        url: process.env.GRPC_USER_SERVICE_URL || 'localhost:50051',
      },
    },
  );

  // Create Notification gRPC microservice
  const notificationApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    GrpcModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'notification',
        protoPath: join(__dirname, '../../proto/notification.proto'),
        url: process.env.GRPC_NOTIFICATION_SERVICE_URL || 'localhost:50052',
      },
    },
  );

  // Start both microservices
  await Promise.all([
    userApp.listen().then(() => {
      logger.log('User gRPC microservice is listening on port 50051');
    }),
    notificationApp.listen().then(() => {
      logger.log('Notification gRPC microservice is listening on port 50052');
    }),
  ]);
}

bootstrap().catch((error) => {
  console.error('Error starting gRPC microservices:', error);
  process.exit(1);
});