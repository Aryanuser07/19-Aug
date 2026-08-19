import { Response } from 'express';
import Channel, { ChannelType } from '../models/Channel';
import Room from '../models/Room';
import Message from '../models/Message';
import { AuthRequest } from '../middleware/authMiddleware';

export const getChannelsByRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userRole = req.user?.role || 'common';

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    if (userRole !== 'admin' && !room.allowedRoles.includes(userRole as any)) {
      res.status(403).json({ success: false, message: 'Access denied to this room' });
      return;
    }

    const channels = await Channel.find({ roomId }).sort({ type: 1, name: 1 });
    res.status(200).json({ success: true, count: channels.length, channels });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching channels' });
  }
};

export const createChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { name, type, description } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Channel name is required' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    const channelType: ChannelType = ['text', 'voice', 'video'].includes(type) ? type : 'text';

    const newChannel = await Channel.create({
      roomId: room._id,
      name: name.trim(),
      type: channelType,
      description: description || '',
    });

    res.status(201).json({ success: true, channel: newChannel });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating channel' });
  }
};

export const getChannelMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await Message.find({ channelId }).sort({ createdAt: 1 }).limit(limit);

    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching messages' });
  }
};
