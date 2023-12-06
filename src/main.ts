import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { KafkaConsumerService } from './providers/kafka/consumer.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const kafkaConsumerService = app.get(KafkaConsumerService);
  await kafkaConsumerService.startConsumer();
  await app.listen(7000);
}
bootstrap();
