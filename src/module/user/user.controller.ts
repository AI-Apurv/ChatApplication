import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  FileSendDto,
  GetMessageDto,
  LoginRequestDto,
  OneToOneChatDto,
  RegisterRequestDto,
} from './dto/user.dto';
import { JwtAuthGuard } from 'src/Middleware/jwt.auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import e from 'express';

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

  @Post('sendMessageOne')
  @UseGuards(JwtAuthGuard)
  private async sendOneToOneMessage(
    @Body() body: OneToOneChatDto,
    @Request() req,
  ) {
    const email = req.user.email;
    return this.userService.sendOneToOne(body, email);
  }

  @Post('fileSend')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  private async fileSendOneToOne(
    @UploadedFile() file,
    @Body() body: FileSendDto,
    @Request() req,
  ) {
    return this.userService.sendFileOneToOne(body, file.buffer, req.user.email);
  }

  @Post('getMessage')
  @UseGuards(JwtAuthGuard)
  private async getMessage(
    @Body() getMessageDto: GetMessageDto,
    @Request() req,
  ) {
    return this.userService.getMessage(getMessageDto.userId, req.user.email);
  }
}
