# NestJS 基础框架


## 🚀 Features

- **NestJS Framework**: Modern Node.js framework with TypeScript
- **Database**: MySQL with TypeORM for data persistence
- **Caching**: Redis for high-performance caching
- **Message Queue**: RabbitMQ for asynchronous processing
- **Microservices**: gRPC for inter-service communication
- **Authentication**: JWT-based authentication and authorization
- **File Upload**: Multer with image processing
- **API Documentation**: Swagger/OpenAPI integration
- **Logging**: Winston for comprehensive logging
- **Testing**: Jest with property-based testing using fast-check
- **Containerization**: Docker and Docker Compose

## 📋 Prerequisites

- Node.js 18+
- Docker and Docker Compose
- MySQL 8.0
- Redis 7.x
- RabbitMQ 3.12

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nestjs-learning-api
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration.

## 🐳 Docker Setup

### Development with Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production with Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
# Start development server with hot reload
npm run start:dev

# Start with debug mode
npm run start:debug
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run test coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## 📊 Database

### Migrations

```bash
# Generate migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Seed Data

```bash
# Run seed data
npm run seed
```

## 📚 API Documentation

Once the application is running, you can access:

- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **Application Info**: http://localhost:3000

## 🔧 Services

### MySQL Database
- **Port**: 3306
- **Database**: nestjs_learning_api
- **Management UI**: http://localhost:8080 (phpMyAdmin)

### Redis Cache
- **Port**: 6379

### RabbitMQ
- **AMQP Port**: 5672
- **Management UI**: http://localhost:15672
- **Credentials**: guest/guest

### gRPC Service
- **Port**: 50051

## 📁 Project Structure

```
src/
├── app.module.ts              # Root module
├── main.ts                    # Application entry point
├── config/                    # Configuration files
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── rabbitmq.config.ts
├── common/                    # Common utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── modules/                   # Business modules
│   ├── auth/                 # Authentication module
│   ├── users/                # User management
│   ├── files/                # File upload/management
│   ├── cache/                # Cache module
│   ├── queue/                # Message queue
│   └── grpc/                 # gRPC services
├── entities/                  # Database entities
├── dto/                      # Data transfer objects
├── migrations/               # Database migrations
├── seeds/                    # Seed data
└── proto/                    # Protocol Buffer definitions
```

## 🔐 Environment Variables

See `.env.example` for all available environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- All the open-source libraries used in this project