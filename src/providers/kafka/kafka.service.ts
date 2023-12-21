import { Injectable } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';

@Injectable()
export class KafkaService {
  private kafka: Kafka;
  private consumer: Consumer;
  private consumer2: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'chat-application',
      brokers: ['localhost:9092'],
    });
    this.consumer = this.kafka.consumer({ groupId: 'kafka-group' });
    this.consumer2 = this.kafka.consumer({ groupId: 'kafka-group2' });
  }

  getConsumer() {
    return this.consumer;
  }

  getConsumer2() {
    return this.consumer2;
  }
}
