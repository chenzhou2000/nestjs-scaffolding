import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AppService } from './app.service'

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application information' })
  @ApiResponse({
    status: 200,
    description: 'Application information retrieved successfully',
  })
  getHello(): string {
    return this.appService.getHello()
  }
}
