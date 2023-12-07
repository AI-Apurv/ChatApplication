import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
@Schema()
export class Users extends Document {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  userName: string;

  @Prop()
  email: string;

  @Prop()
  password: string;

  @Prop()
  contactNumber: string;

  @Prop({ type: [String], default: [] })
  topics: string[];
}

export const UserSchema = SchemaFactory.createForClass(Users);
