import { Injectable } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Injectable()
export class KafkaConsumerService {
  constructor(private readonly kafkaService: KafkaService) {}
  private isActive = false;
  private consumer = this.kafkaService.getConsumer();

  async startConsumer(topics: string[]) {
    await this.consumer.stop();
    if (this.isActive) {
      topics.forEach((topic) => {
        this.consumer.subscribe({ topic , fromBeginning:true});
      });
      await this.consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          try{
          const chat = JSON.parse(message.value.toString());
          console.log({partition,
            offset: message.offset,
            chat});
            await new Promise((resolve)=> setTimeout(resolve,1000));
            await this.consumer.commitOffsets([{
              topic,
              partition,
              offset: (Number(message.offset)+ 1).toString(),
            }])
          } catch(error) {
            console.log('Error parsing kafka message',error);
          }
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
