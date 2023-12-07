import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/module/user/user.service';
import { Users } from 'src/module/user/entity/user.entity';
import { userResponse } from 'src/common/user.response';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from 'src/providers/redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(Users.name)
    private userModel: Model<Users>,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'user-secret-key',
    });
  }

  async validate(payload: any) {
    const user = await this.userModel.findOne({ email: payload.email });
    if (!user) throw new UnauthorizedException(userResponse.NOT_EXIST);
    const sessionStatus = await this.redisService.redisGet(user.email);
    if (sessionStatus == 'false')
      throw new UnauthorizedException(userResponse.LOGOUT);

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
