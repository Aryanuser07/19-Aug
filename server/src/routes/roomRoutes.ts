import { Router } from 'express';
import { getRooms, getRoomById, createRoom } from '../controllers/roomController';
import { getChannelsByRoom, createChannel, getChannelMessages } from '../controllers/channelController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.route('/')
  .get(getRooms)
  .post(restrictTo('admin'), createRoom);

router.route('/:id')
  .get(getRoomById);

router.route('/:roomId/channels')
  .get(getChannelsByRoom)
  .post(restrictTo('admin'), createChannel);

router.get('/channels/:channelId/messages', getChannelMessages);

export default router;
