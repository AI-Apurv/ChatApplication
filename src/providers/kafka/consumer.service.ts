import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Injectable()
export class KafkaConsumerService {
  constructor(private readonly kafkaService: KafkaService) {}
  private isActive = false;
  private consumer = this.kafkaService.getConsumer();

  async startConsumer(topics: string[]) {
    if (this.isActive) {
      topics.forEach((topic) => {
        this.consumer.subscribe({ topic });
      });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const chat = JSON.parse(message.value.toString());
          console.log(chat);
        },
      });
    }
  }

  async setUserActivity(isActive: boolean) {
    this.isActive = isActive;
    if (isActive) {
      this.isActive = true;
    } else {
      this.isActive = false;
    }
  }

  stopConsumer(){
    this.kafkaService.getConsumer().stop()
  }
}
