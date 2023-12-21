import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(
    @Inject('REDIS_SESSION')
    private readonly redisSession: Redis,
  ) {}

  async redisSet(key: any, value: any, expTime: any) {
    const data = await this.redisSession.set(key, value, 'EX', expTime);
    return data;
  }
  async redisGet(key: string) {
    const data = await this.redisSession.get(key);
    return data;
  }

  async redisDel(key: string) {
    const data = await this.redisSession.del(key);
    return data;
  }
}
