import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Injectable()
export class KafkaConsumerService {
  constructor(private readonly kafkaService: KafkaService) {}

  async startConsumer() {
    const consumer = this.kafkaService.getConsumer();
    consumer.subscribe({ topic: 'groupChat' });
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const chat = JSON.parse(message.value.toString());
        console.log(chat);
      },
    });
  }
}
