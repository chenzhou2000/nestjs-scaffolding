import { DataSource } from 'typeorm'
import { User, UserRole } from '../entities/user.entity'
import { dataSourceOptions } from '../config/database.config'
import * as bcrypt from 'bcryptjs'

async function seed() {
  const dataSource = new DataSource(dataSourceOptions)
  
  try {
    await dataSource.initialize()
    console.log('Database connection established')

    const userRepository = dataSource.getRepository(User)

    // Check if users already exist
    const existingUsers = await userRepository.count()
    if (existingUsers > 0) {
      console.log('Seed data already exists, skipping...')
      return
    }

    // Create admin user
    const adminUser = userRepository.create({
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    })

    // Create regular user
    const regularUser = userRepository.create({
      email: 'user@example.com',
      password: await bcrypt.hash('user123', 10),
      firstName: 'Regular',
      lastName: 'User',
      role: UserRole.USER,
      isActive: true,
    })

    // Create moderator user
    const moderatorUser = userRepository.create({
      email: 'moderator@example.com',
      password: await bcrypt.hash('moderator123', 10),
      firstName: 'Moderator',
      lastName: 'User',
      role: UserRole.MODERATOR,
      isActive: true,
    })

    await userRepository.save([adminUser, regularUser, moderatorUser])
    console.log('Seed data created successfully')
    console.log('Created users:')
    console.log('- Admin: admin@example.com / admin123')
    console.log('- User: user@example.com / user123')
    console.log('- Moderator: moderator@example.com / moderator123')

  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await dataSource.destroy()
  }
}

if (require.main === module) {
  seed()
}

export default seed