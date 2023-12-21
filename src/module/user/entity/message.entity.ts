import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum MessageStatus {
  SENT = 'sent',
  DELIEVERED = 'delievered',
  SEEN = 'seen',
}

@Schema()
export class Message extends Document {
  @Prop()
  topic: string;

  @Prop()
  SenderName: string;

  @Prop()
  ReceiverName: string;

  @Prop()
  message: string;

  @Prop({ type: String, enum: MessageStatus })
  messageStatus: string;

  @Prop()
  tempId: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
