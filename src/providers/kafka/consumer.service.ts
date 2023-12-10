import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageStatus } from 'src/module/user/entity/message.entity';
import { Model } from 'mongoose';

@Injectable()
export class KafkaConsumerService {
  constructor(
    private readonly kafkaService: KafkaService,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
  ) {}
  private isActive = false;
  private consumer = this.kafkaService.getConsumer();

  async startConsumer(topics: string[]) {
    await this.consumer.stop();
    if (this.isActive) {
      topics.forEach((topic) => {
        this.consumer.subscribe({ topic, fromBeginning: true });
      });
      await this.consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const chat = JSON.parse(message.value.toString());
            const { tempId, ...data } = chat;
            console.log({ partition, offset: message.offset, data });
            const temporaryMessageId = chat.tempId;
            await this.processAndMarkDelivered(temporaryMessageId);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await this.consumer.commitOffsets([
              {
                topic,
                partition,
                offset: (Number(message.offset) + 1).toString(),
              },
            ]);
          } catch (error) {
            console.log('Error parsing kafka message', error);
          }
        },
      });
    }
  }

  async processAndMarkDelivered(temporaryMessageId: string) {
    const message = await this.messageModel.findOne({
      tempId: temporaryMessageId,
    });
    message.messageStatus = MessageStatus.DELIEVERED;
    await message.save();
  }

  async setUserActivity(isActive: boolean) {
    this.isActive = isActive;
    if (isActive) {
      this.isActive = true;
    } else {
      this.isActive = false;
    }
  }

  stopConsumer() {
    this.kafkaService.getConsumer().stop();
  }
}
