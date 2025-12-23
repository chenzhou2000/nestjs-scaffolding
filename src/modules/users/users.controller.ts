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
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from '../../dto/create-user.dto'
import { UpdateUserDto } from '../../dto/update-user.dto'
import { UserResponseDto } from '../../dto/user-response.dto'
import { QueryUserDto, PaginatedResult } from '../../dto/query-user.dto'
import { plainToClass } from 'class-transformer'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto)
    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
  }

  @Get()
  async findAll(@Query() queryDto: QueryUserDto): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.usersService.findAll(queryDto)
    
    return {
      ...result,
      data: result.data.map(user => 
        plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
      ),
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id)
    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateUserDto)
    return plainToClass(UserResponseDto, user, { excludeExtraneousValues: true })
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.usersService.delete(id)
  }
}