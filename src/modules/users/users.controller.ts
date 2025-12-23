import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from '../../dto/create-user.dto'
import { UpdateUserDto } from '../../dto/update-user.dto'
import { UserResponseDto } from '../../dto/user-response.dto'
import { QueryUserDto, PaginatedResult } from '../../dto/query-user.dto'
import { plainToClass } from 'class-transformer'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserRole, User } from '../../entities/user.entity'

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto)
    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async findAll(@Query() queryDto: QueryUserDto): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.usersService.findAll(queryDto)
    
    return {
      ...result,
      data: result.data.map(user => 
        plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
      ),
    }
  }

  @Get('me')
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id)
    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.update(user.id, updateUserDto)
    return plainToClass(UserResponseDto, updatedUser, { excludeExtraneousValues: true })
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateUserDto)
    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.delete(id)
  }
}