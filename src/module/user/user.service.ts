import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Users } from './entity/user.entity';
import { Model } from 'mongoose';
import { RedisService } from 'src/providers/redis/redis.service';
import {
  FileSendDto,
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
    await this.kafkaConsumerService.startConsumer(user.topics, user.email);
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
    await this.kafkaConsumerService.stopConsumer(email);
    return {
      status: HttpStatus.OK,
      response: userResponse.LOGOUT_SUCCESS,
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
    const tempMessageId = this.generateTempMessageId();
    this.sendToTopic(topic, body.message, sender.email, tempMessageId);
    const newMessage = new this.messageModel({
      topic: topic,
      SenderName: sender.firstName,
      ReceiverName: receiver.firstName,
      message: body.message,
      messageStatus: MessageStatus.SENT,
      tempId: tempMessageId,
      createdAt: new Date(),
    });
    await newMessage.save();
    return {
      status: HttpStatus.OK,
      response: 'Message sent successfully',
      error: null,
    };
  }

  public async sendFileOneToOne(body: FileSendDto, file: any, email: string) {
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
    const tempMessageId = this.generateTempMessageId();
    this.sendToTopic(topic, file, sender.firstName, tempMessageId);
    const newMessage = new this.messageModel({
      topic: topic,
      SenderName: sender.firstName,
      ReceiverName: receiver.firstName,
      message: file,
      messageStatus: MessageStatus.SENT,
      tempId: tempMessageId,
      createdAt: new Date(),
    });
    await newMessage.save();
    return {
      status: HttpStatus.OK,
      response: 'Message sent successfully',
      error: null,
    };
  }

  public async getMessage(userId: string, email: string) {
    const sender = await this.userModel.findOne({ _id: userId });
    const receiver = await this.userModel.findOne({ email: email });
    const sortedUsernames = [receiver.userName, sender.userName].sort();
    const topic = sortedUsernames.join('');

    const messages = await this.messageModel.find(
      { topic: topic, messageStatus: MessageStatus.DELIEVERED },
      { SenderName: 1, message: 1 },
    );
    for (const message of messages) {
      if (message.messageStatus !== MessageStatus.SEEN) {
        message.messageStatus = MessageStatus.SEEN;
        await message.save();
      }
    }
    return {
      status: HttpStatus.OK,
      response:
        'Messages retrieved and marked as seen starting from "delivered" successfully',
      messages,
      error: null,
    };
  }

  public async sendToTopic(
    topic: string,
    message: any,
    senderEmail: string,
    tempId: string,
  ) {
    const kafkaPayload = {
      sender: senderEmail,
      message: message,
      tempId: tempId,
      time: Date.now(),
    };
    await this.kafkaProducerService.sendToKafka(topic, kafkaPayload);
  }

  public generateTempMessageId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
