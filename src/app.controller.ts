import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('config')
  getConfig() {
    const turnUrl = this.configService.get('TURN_URL');
    const turnUsername = this.configService.get('TURN_USERNAME');
    const turnCredential = this.configService.get('TURN_CREDENTIAL');

    const iceServers: any[] = [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ];

    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      });
    }

    return { iceServers };
  }
}
