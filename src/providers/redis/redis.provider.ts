import { Redis } from 'ioredis';
import { Provider } from '@nestjs/common';

export const REDIS_SESSION: Provider = {
  provide: 'REDIS_SESSION',
  useFactory: async () => {
    const client: Redis = new Redis({
      host: '127.0.0.1',
      port: 6379,
      db: 0,
    });
    client.on('connect', (err: any) => {
      console.log('Redis connected');
    });
    client.on('error', (err: any) => {
      console.log('Error in Redis ', err);
    });
    return client;
  },
};
