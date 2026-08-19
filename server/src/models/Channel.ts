import mongoose, { Schema, Document } from 'mongoose';

export type ChannelType = 'text' | 'voice' | 'video';

export interface IChannel extends Document {
  roomId: mongoose.Types.ObjectId;
  name: string;
  type: ChannelType;
  description?: string;
  isDefault: boolean;
  createdAt: Date;
}

const ChannelSchema: Schema<IChannel> = new Schema(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'voice', 'video'],
      default: 'text',
    },
    description: {
      type: String,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ChannelSchema.index({ roomId: 1, name: 1 }, { unique: true });

export default mongoose.model<IChannel>('Channel', ChannelSchema);
