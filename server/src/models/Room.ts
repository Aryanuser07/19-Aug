import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from './User';

export interface IRoom extends Document {
  name: string;
  description?: string;
  allowedRoles: UserRole[];
  createdBy?: mongoose.Types.ObjectId;
  isDefault: boolean;
  createdAt: Date;
}

const RoomSchema: Schema<IRoom> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
    },
    allowedRoles: {
      type: [String],
      enum: ['admin', 'mern-dev', 'php-dev', 'common'],
      default: ['admin', 'common'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

export default mongoose.model<IRoom>('Room', RoomSchema);
