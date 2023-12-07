import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import {
  LoginRequestDto,
  OneToOneChatDto,
  RegisterRequestDto,
  SendMessageDto,
  SubscribeDto,
} from './dto/user.dto';
import { JwtAuthGuard } from 'src/Middleware/jwt.auth.guard';

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

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  private async logout(@Request() req) {
    const email = req.user.email;
    return this.userService.logout(email);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  private async subscribeToTopic(@Body() body: SubscribeDto, @Request() req) {
    const mail = req.user.email;
    console.log(mail);
    return this.userService.subscribeToTopic(body.topic, mail);
  }

  @Post('sendMessageGroup')
  @UseGuards(JwtAuthGuard)
  private async sendMessage(@Body() body: SendMessageDto, @Request() req) {
    const email = req.user.email;
    console.log(email);
    return this.userService.sendMessage(body.message, email);
  }

  @Post('sendMessageOne')
  @UseGuards(JwtAuthGuard)
  private async sendOneToOneMessage(
    @Body() body: OneToOneChatDto,
    @Request() req,
  ) {
    const email = req.user.email;
    return this.userService.sendOneToOne(body, email);
  }
}
