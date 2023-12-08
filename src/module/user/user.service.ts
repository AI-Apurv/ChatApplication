import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Users } from './entity/user.entity';
import { Model } from 'mongoose';
import { RedisService } from 'src/providers/redis/redis.service';
import {
  LoginRequestDto,
  OneToOneChatDto,
  RegisterRequestDto,
} from './dto/user.dto';
import { userResponse } from 'src/common/user.response';
import { Sessions } from './entity/session.entity';
import { JwtService } from './jwt.service';
import { KafkaProducerService } from 'src/providers/kafka/producer.service';
import { KafkaConsumerService } from 'src/providers/kafka/consumer.service';
import { Message, MessageStatus } from './entity/message.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(Users.name)
    private readonly userModel: Model<Users>,
    @InjectModel(Sessions.name)
    private readonly sessionModel: Model<Sessions>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly kafkaConsumerService: KafkaConsumerService,
  ) {}

  public async register(registerRequestDto: RegisterRequestDto) {
    const user: Users = await this.userModel.findOne({
      email: registerRequestDto.email,
    });
    const userName: Users = await this.userModel.findOne({
      userName: registerRequestDto.userName,
    });
    if (user) {
      return {
        status: HttpStatus.CONFLICT,
        response: userResponse.ALREADY_EXISTS,
        error: null,
      };
    }
    if (userName) {
      return {
        status: HttpStatus.CONFLICT,
        response: userResponse.USERNAME_EXIST,
        error: null,
      };
    }
    const newUser = new this.userModel({
      firstName: registerRequestDto.firstName,
      lastName: registerRequestDto.lastName,
      userName: registerRequestDto.userName,
      email: registerRequestDto.email,
      password: await this.jwtService.encodePassword(
        registerRequestDto.password,
      ),
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
    const isPasswordValid = await this.jwtService.isPasswordValid(
      loginRequestDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      return {
        status: HttpStatus.NOT_FOUND,
        response: userResponse.WRONG_PASS,
        error: null,
        token: null,
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
    const token: string = this.jwtService.generateToken(user);
    await this.kafkaConsumerService.setUserActivity(true);
    await this.kafkaConsumerService.startConsumer(user.topics);
    return {
      token,
      status: HttpStatus.OK,
      response: userResponse.LOGIN_SUCCESS,
      error: null,
    };
  }

  public async logout(email: string) {
    const user: Users = await this.userModel.findOne({ email: email });
    await this.redisService.redisSet(user.email, false, 7200);
    const session = await this.sessionModel.findOne({ email: user.email });
    session.isActive = false;
    session.save();
    await this.kafkaConsumerService.setUserActivity(false);
    await this.kafkaConsumerService.stopConsumer()
    return {
      status: HttpStatus.OK,
      response: userResponse.LOGOUT_SUCCESS,
      error: null,
    };
  }

  public async sendMessage(message: string, email: string) {
    const user = await this.userModel.findOne({ email: email });
    const topic = 'groupChat';
    if (!user.topics.includes(topic)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        response: 'You are not subscribed to the groupChat topic',
        error: null,
      };
    }

    const kafkaPayload = {
      sender: user.firstName,
      message: message,
      time: Date.now(),
    };
    await this.kafkaProducerService.sendToKafka(topic, kafkaPayload);

    return {
      status: HttpStatus.OK,
      response: 'Message sent successfully',
      error: null,
    };
  }

  public async subscribeToTopic(topic: string, email: string) {
    const user = await this.userModel.findOne({ email: email });
    if (!user.topics.includes(topic)) {
      user.topics.push(topic);
      await user.save();
    }

    return {
      status: HttpStatus.OK,
      response: `Subscribed to ${topic} successfully`,
      error: null,
    };
  }

  public async sendOneToOne(body: OneToOneChatDto, email: string) {
    const receiver = await this.userModel.findOne({ _id: body.userId });
    if (!receiver)
      return {
        status: HttpStatus.NOT_FOUND,
        response: userResponse.NOT_EXIST,
        error: null,
      };
    const sender = await this.userModel.findOne({ email: email });
    const sortedUsernames = [receiver.userName, sender.userName].sort();
    const topic = sortedUsernames.join('');
    const receivertopicExists = receiver.topics.includes(topic);
    if (!receivertopicExists) {
      receiver.topics.push(topic);
      await receiver.save();
    }
    const sendertopicExists = sender.topics.includes(topic);
    if (!sendertopicExists) {
      sender.topics.push(topic);
      await sender.save();
    }
    this.sendToTopic(topic, body.message, sender.firstName);
    const newMessage = new this.messageModel({
      topic: topic,
      SenderName: sender.firstName,
      ReceiverName: receiver.firstName,
      message: body.message,
      messageStatus: MessageStatus.SENT,
      createdAt: new Date()
    });
    await newMessage.save();
    return {
      status: HttpStatus.OK,
      response: 'Message sent successfully',
      error: null,
    };
  }

  public async sendToTopic(topic: string, message: string, sender: string) {
    const kafkaPayload = {
      sender: sender,
      message: message,
      time: Date.now(),
    };
    this.kafkaConsumerService.stopConsumer();
    await this.kafkaProducerService.sendToKafka(topic, kafkaPayload);
  }
}
