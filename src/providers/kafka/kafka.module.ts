import { Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KafkaProducerService } from './producer.service';
import { KafkaConsumerService } from './consumer.service';
import { MessageSchema } from 'src/module/user/entity/message.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Message', schema: MessageSchema }]),
  ],
  providers: [KafkaProducerService, KafkaService, KafkaConsumerService],
  exports: [KafkaProducerService, KafkaService, KafkaConsumerService],
})
export class KafkaModule {}
