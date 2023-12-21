import { Injectable } from '@nestjs/common';
import { Kafka } from 'kafkajs';

@Injectable()
export class KafkaProducerService {
  private kafka: Kafka;
  private producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'Group-chat',
      brokers: ['localhost:9092'],
    });
    this.producer = this.kafka.producer();
  }

  async sendToKafka(topic: string, data: any) {
    await this.producer.connect();
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(data),
        },
      ],
    });
    await this.producer.disconnect();
  }
}
