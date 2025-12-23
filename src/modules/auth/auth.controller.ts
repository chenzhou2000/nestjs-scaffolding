import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto } from '../../dto/auth.dto'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto)
    // Don't return password in response
    const { password, ...result } = user
    return result
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    const token = req.headers.authorization?.replace('Bearer ', '')
    await this.authService.logout(token)
    return { message: 'Successfully logged out' }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken)
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req) {
    return req.user
  }
}