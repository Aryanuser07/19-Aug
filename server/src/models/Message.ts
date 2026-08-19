import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  channelId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: Date;
}

const MessageSchema: Schema<IMessage> = new Schema(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderAvatar: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMessage>('Message', MessageSchema);
