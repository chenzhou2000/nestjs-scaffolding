import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { GrpcUserService } from './services/grpc-user.service';
import { GrpcNotificationService } from './services/grpc-notification.service';
import { GrpcClientService } from './services/grpc-client.service';
import { GrpcUserController } from './controllers/grpc-user.controller';
import { GrpcNotificationController } from './controllers/grpc-notification.controller';
import { GrpcDemoController } from './controllers/grpc-demo.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    ClientsModule.register([
      {
        name: 'USER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: join(__dirname, '../../proto/user.proto'),
          url: process.env.GRPC_USER_SERVICE_URL || 'localhost:50051',
        },
      },
      {
        name: 'NOTIFICATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'notification',
          protoPath: join(__dirname, '../../proto/notification.proto'),
          url: process.env.GRPC_NOTIFICATION_SERVICE_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  controllers: [GrpcUserController, GrpcNotificationController, GrpcDemoController],
  providers: [GrpcUserService, GrpcNotificationService, GrpcClientService],
  exports: [GrpcUserService, GrpcNotificationService, GrpcClientService],
})
export class GrpcModule {}