import { Response } from 'express';
import Room from '../models/Room';
import Channel from '../models/Channel';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/authMiddleware';
import { SEED_USERS } from '../config/seedUsers';

export const getRooms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role || 'common';

    let rooms;
    if (userRole === 'admin') {
      rooms = await Room.find().sort({ createdAt: 1 });
    } else {
      rooms = await Room.find({ allowedRoles: { $in: [userRole] } }).sort({ createdAt: 1 });
    }

    res.status(200).json({ success: true, count: rooms.length, rooms });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching rooms' });
  }
};

export const getRoomById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role || 'common';

    const room = await Room.findById(id);
    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }

    if (userRole !== 'admin' && !room.allowedRoles.includes(userRole as any)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Role '${userRole}' is not permitted in room '${room.name}'`,
      });
      return;
    }

    res.status(200).json({ success: true, room });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching room details' });
  }
};

export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, allowedRoles } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Room name is required' });
      return;
    }

    const existingRoom = await Room.findOne({ name: name.trim() });
    if (existingRoom) {
      res.status(409).json({ success: false, message: 'Room with this name already exists' });
      return;
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : ['admin', 'common'];
    if (!roles.includes('admin')) roles.push('admin');

    const newRoom = await Room.create({
      name: name.trim(),
      description: description || '',
      allowedRoles: roles,
      createdBy: req.user?._id,
    });

    // Auto-create default channels for new room
    await Channel.create([
      {
        roomId: newRoom._id,
        name: 'general',
        type: 'text',
        description: 'General text chat for ' + newRoom.name,
        isDefault: true,
      },
      {
        roomId: newRoom._id,
        name: 'Voice Lounge',
        type: 'voice',
        description: 'Voice & Video channel for ' + newRoom.name,
        isDefault: true,
      },
    ]);

    res.status(201).json({ success: true, room: newRoom });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error creating room' });
  }
};

export const seedDefaultRooms = async (): Promise<void> => {
  try {
    const salt = await bcrypt.genSalt(10);

    // 1. Seed Demo Users if missing (using external config)
    let adminUser = await User.findOne({ role: 'admin' });

    for (const u of SEED_USERS) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        const passwordHash = await bcrypt.hash(u.password, salt);
        const created = await User.create({
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role as any,
          avatar: u.avatar,
        });
        if (u.role === 'admin') adminUser = created;
        console.log(`[Seeder] Seeded demo user: ${u.name} (${u.email})`);
      }
    }

    // 2. Seed Default Rooms if none exist
    const roomCount = await Room.countDocuments();
    if (roomCount > 0) return;

    console.log('[Seeder] Seeding default workspace rooms and channels...');

    if (!adminUser) {
      adminUser = await User.findOne({ role: 'admin' });
    }

    // 1. Common Room
    const commonRoom = await Room.create({
      name: 'Common Room',
      description: 'General hub for all team members across all stacks',
      allowedRoles: ['admin', 'mern-dev', 'php-dev', 'common'],
      createdBy: adminUser?._id,
      isDefault: true,
    });

    await Channel.create([
      { roomId: commonRoom._id, name: 'general-chat', type: 'text', description: 'All-team discussion', isDefault: true },
      { roomId: commonRoom._id, name: 'Main Lobby', type: 'voice', description: 'Common audio & video channel', isDefault: true },
      { roomId: commonRoom._id, name: 'Townhall Meeting', type: 'video', description: 'Large team townhall', isDefault: false },
    ]);

    // 2. MERN Room
    const mernRoom = await Room.create({
      name: 'MERN Stack Room',
      description: 'Private workspace for React, Node, MongoDB developers',
      allowedRoles: ['admin', 'mern-dev'],
      createdBy: adminUser?._id,
    });

    await Channel.create([
      { roomId: mernRoom._id, name: 'mern-discussion', type: 'text', description: 'MERN architecture & code review', isDefault: true },
      { roomId: mernRoom._id, name: 'MERN Standup', type: 'voice', description: 'Daily MERN voice sync', isDefault: true },
    ]);

    // 3. PHP Room
    const phpRoom = await Room.create({
      name: 'PHP Stack Room',
      description: 'Private workspace for Laravel, Symfony, PHP developers',
      allowedRoles: ['admin', 'php-dev'],
      createdBy: adminUser?._id,
    });

    await Channel.create([
      { roomId: phpRoom._id, name: 'php-discussion', type: 'text', description: 'PHP codebase & API discussion', isDefault: true },
      { roomId: phpRoom._id, name: 'PHP Standup', type: 'voice', description: 'Daily PHP voice sync', isDefault: true },
    ]);

    console.log('[Seeder] Seeded 3 default rooms and initial channels successfully.');
  } catch (error) {
    console.error('[Seeder] Error during seeding:', error);
  }
};
