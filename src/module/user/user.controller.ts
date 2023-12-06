import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { LoginRequestDto, RegisterRequestDto, SendMessageDto } from './dto/user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  private async register(@Body() body: RegisterRequestDto) {
    return this.userService.register(body);
  }

  @Post('login')
  private async login(@Body() body: LoginRequestDto) {
    return this.userService.login(body);
  }

  @Post('sendMessage')
  private async sendMessage(@Body() body: SendMessageDto) {
    return this.userService.sendMessage(body);
  }
}
