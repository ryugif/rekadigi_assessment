import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({
    description: 'Simple API greeting',
    schema: {
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
