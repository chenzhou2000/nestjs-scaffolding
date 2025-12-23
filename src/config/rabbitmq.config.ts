import { registerAs } from '@nestjs/config'

export const rabbitmqConfig = registerAs('rabbitmq', () => ({
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  user: process.env.RABBITMQ_USER || 'guest',
  password: process.env.RABBITMQ_PASSWORD || 'guest',
  queues: {
    email: 'email_queue',
    notifications: 'notifications_queue',
    tasks: 'tasks_queue',
  },
}))
