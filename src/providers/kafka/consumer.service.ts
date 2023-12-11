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
  private consumer2 = this.kafkaService.getConsumer2();
  private consumerActive = false;
  private consumer2Active = false;
  private selectedConsumer;
  private activeConsumers: { [email: string]: any } = {};

  async startConsumer(topics: string[], email: string) {
    if (this.isActive) {
      if (this.consumerActive) {
        this.consumer2Active = true;
        this.selectedConsumer = this.consumer2;
        this.activeConsumers[email] = this.consumer2;
      }
      if (!this.consumer2Active) {
        this.consumerActive = true;
        this.selectedConsumer = this.consumer;
        this.activeConsumers[email] = this.consumer;
      }
      topics.forEach((topic) => {
        this.selectedConsumer.subscribe({ topic, fromBeginning: true });
      });
      await this.selectedConsumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const chat = JSON.parse(message.value.toString());
            const { tempId, ...data } = chat;
            if (chat.sender !== email) {
              console.log({ partition, offset: message.offset, data });
              const temporaryMessageId = chat.tempId;
              await this.processAndMarkDelivered(temporaryMessageId);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              await this.selectedConsumer.commitOffsets([
                {
                  topic,
                  partition,
                  offset: (Number(message.offset) + 1).toString(),
                },
              ]);
            }
            email;
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

  stopConsumer(email: string) {
    const activeConsumer = this.activeConsumers[email];
    if (activeConsumer) {
      activeConsumer.stop();
      delete this.activeConsumers[email];
    }
  }
}
