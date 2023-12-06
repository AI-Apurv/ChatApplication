import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Users } from './entity/user.entity';
import { Model } from 'mongoose';
import { RedisService } from 'src/providers/redis/redis.service';
import { LoginRequestDto, RegisterRequestDto, SendMessageDto } from './dto/user.dto';
import { userResponse } from 'src/common/user.response';
import { Sessions } from './entity/session.entity';
import { JwtService } from './jwt.service';
import { KafkaProducerService } from 'src/providers/kafka/producer.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(Users.name)
    private readonly userModel: Model<Users>,
    @InjectModel(Sessions.name)
    private readonly sessionModel: Model<Sessions>,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly kafkaProducerService: KafkaProducerService
  ) {}

  public async register(registerRequestDto: RegisterRequestDto) {
    const user: Users = await this.userModel.findOne({
      email: registerRequestDto.email,
    });
    if (user) {
      return {
        status: HttpStatus.CONFLICT,
        response: userResponse.ALREADY_EXISTS,
        error: null,
      };
    }
    const newUser = new this.userModel({
      firstName: registerRequestDto.firstName,
      lastName: registerRequestDto.lastName,
      userName: registerRequestDto.userName,
      email: registerRequestDto.email,
      password: await this.jwtService.encodePassword(registerRequestDto.password),
      contactNumber: registerRequestDto.contactNumber,
    });
    await newUser.save();
    return {
      status: HttpStatus.CREATED,
      response: userResponse.SIGNUP_SUCCESS,
      error: null,
    };
  }

  public async login(loginRequestDto: LoginRequestDto) {
    const user: Users = await this.userModel.findOne({
      email: loginRequestDto.email,
    });
    if (!user) {
      return {
        status: HttpStatus.NOT_FOUND,
        response: userResponse.NOT_EXIST,
        token: null,
        error: null,
      };
    }
    await this.redisService.redisSet(user.email, true, 3600);
    const session = await this.sessionModel.findOne({ email: user.email });
    if (!session) {
      const status = new this.sessionModel({
        email: loginRequestDto.email,
        isActive: true,
      });
      await status.save();
    } else {
      session.isActive = true;
      await session.save();
    }
    const isPasswordValid = await this.jwtService.isPasswordValid(loginRequestDto.password, user.password);
    if (!isPasswordValid) {
      return {
        status: HttpStatus.NOT_FOUND,
        response: userResponse.WRONG_PASS,
        error: null,
        token: null,
      };
    }
    const token: string = this.jwtService.generateToken(user)
    return {
      token,
      status: HttpStatus.OK,
      response: userResponse.LOGIN_SUCCESS,
      error: null,
    };
  }

  public async logout(userId: string) {
    const user: Users = await this.userModel.findOne({ _id: userId });
    await this.redisService.redisSet(user.email, false, 7200);
    const session = await this.sessionModel.findOne({ email: user.email });
    session.isActive = false;
    session.save();
    return {
      status: HttpStatus.OK,
      response: userResponse.LOGOUT_SUCCESS,
      error: null,
    };
  }

  public async sendMessage(sendMessageDto: SendMessageDto){
    await this.kafkaProducerService.sendToKafka('groupChat',sendMessageDto.message)
  }
}
