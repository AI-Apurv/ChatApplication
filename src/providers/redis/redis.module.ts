import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { REDIS_SESSION } from './redis.provider';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [REDIS_SESSION, RedisService],
  exports: [RedisService],
})
export class RedisModule {}
