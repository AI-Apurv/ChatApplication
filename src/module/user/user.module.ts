import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RedisModule } from 'src/providers/redis/redis.module';
import { UserSchema } from './entity/user.entity';
import { SessionSchema } from './entity/session.entity';
import { RedisService } from 'src/providers/redis/redis.service';
import { REDIS_SESSION } from 'src/providers/redis/redis.provider';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from './jwt.service';
import { KafkaModule } from 'src/providers/kafka/kafka.module';
import { JwtStrategy } from 'src/Middleware/jwt.strategy';
import { MessageSchema } from './entity/message.entity';

@Module({
  imports: [
    JwtModule.register({
      secret: 'user-secret-key',
      signOptions: { expiresIn: '2d' },
    }),
    MongooseModule.forFeature([
      { name: 'Users', schema: UserSchema },
      { name: 'Sessions', schema: SessionSchema },
      { name: 'Message', schema: MessageSchema },
    ]),
    MongooseModule.forRoot(
      'mongodb+srv://apurv07012001:eovJNBoS9ZztwYoW@cluster1.ze1sxux.mongodb.net/micro_auth',
    ),
    RedisModule,
    KafkaModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    JwtService,
    RedisService,
    REDIS_SESSION,
    JwtStrategy,
  ],
})
export class UserModule {}
