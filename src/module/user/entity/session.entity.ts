import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Sessions extends Document {
  @Prop()
  email: string;

  @Prop()
  isActive: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(Sessions);
