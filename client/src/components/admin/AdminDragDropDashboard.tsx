import React from 'react';
import { useDndContext, DndContext, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core';
import { useWorkspaceStore, PresenceUser, Channel } from '../../store/useWorkspaceStore';
import { socketService } from '../../services/socket';
import { Move, Shield, Users, Hash, Volume2, Sparkles } from 'lucide-react';

// Draggable User Card Component
const DraggableUserCard: React.FC<{ user: PresenceUser }> = ({ user }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: user.userId,
    data: { user },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 rounded-xl border border-white/10 bg-dark-900 p-3 shadow-lg cursor-grab active:cursor-grabbing transition ${
        isDragging ? 'opacity-50 ring-2 ring-brand-500 z-50 scale-105' : 'hover:border-brand-500/50 hover:bg-dark-800'
      }`}
    >
      <img
        src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userName}`}
        alt={user.userName}
        className="h-9 w-9 rounded-lg object-cover border border-white/10"
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-white truncate">{user.userName}</h4>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-brand-300 uppercase">
            {user.role}
          </span>
          <span className="text-[10px] text-gray-400 truncate">
            {user.currentChannelName ? `#${user.currentChannelName}` : 'No channel'}
          </span>
        </div>
      </div>
      <Move className="h-4 w-4 text-gray-500 shrink-0" />
    </div>
  );
};

// Droppable Channel Container Component
const DroppableChannelContainer: React.FC<{ channel: Channel; members: PresenceUser[] }> = ({ channel, members }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: channel._id,
    data: { channel },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border p-4 transition min-h-[160px] ${
        isOver
          ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30'
          : 'border-white/10 bg-dark-850/80 hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {channel.type === 'text' ? (
            <Hash className="h-4 w-4 text-brand-400" />
          ) : (
            <Volume2 className="h-4 w-4 text-emerald-400" />
          )}
          <span className="text-xs font-bold text-white tracking-wide">#{channel.name}</span>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
          {members.length} members
        </span>
      </div>

      <div className="mt-3 flex-1 space-y-2">
        {members.length === 0 ? (
          <div className="flex h-full items-center justify-center border border-dashed border-white/10 rounded-xl p-4 text-[11px] text-gray-500">
            Drop user card here to migrate
          </div>
        ) : (
          members.map((member) => <DraggableUserCard key={member.userId} user={member} />)
        )}
      </div>
    </div>
  );
};

export const AdminDragDropDashboard: React.FC = () => {
  const { currentRoom, channels, onlinePresences, addToast } = useWorkspaceStore();

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !currentRoom) return;

    const targetUserId = active.id as string;
    const targetChannelId = over.id as string;

    const targetChannel = channels.find((c) => c._id === targetChannelId);
    if (!targetChannel) return;

    const targetUser = onlinePresences.find((p) => p.userId === targetUserId);

    // Emit admin forced move event with acknowledgement callback
    const ack = await socketService.emitWithAck('admin:force_move_user', {
      targetUserId,
      targetRoomId: currentRoom._id,
      targetChannelId: targetChannel._id,
      targetChannelName: targetChannel.name,
    });

    if (ack.success) {
      addToast({
        type: 'success',
        title: 'Forced Channel Move',
        message: `Migrated ${targetUser?.userName || 'User'} to #${targetChannel.name}`,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Migration Failed',
        message: ack.message || 'Could not move user',
      });
    }
  };

  return (
    <div className="flex h-full flex-col bg-dark-850 p-6 overflow-y-auto">
      {/* Header Banner */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/40 via-dark-900 to-dark-900 p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Admin Drag & Drop Migration Dashboard</h2>
          </div>
          <p className="mt-1 text-xs text-gray-300">
            Drag any online team member card into a channel container to forcibly auto-switch their active channel.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/30 px-3.5 py-2 text-xs font-semibold text-purple-300">
          <Sparkles className="h-4 w-4" />
          <span>Real-time Socket Protocol Active</span>
        </div>
      </div>

      {/* Droppable Channel Grid */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => {
            const channelMembers = onlinePresences.filter(
              (p) => p.currentChannelId === channel._id
            );

            return (
              <DroppableChannelContainer
                key={channel._id}
                channel={channel}
                members={channelMembers}
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
};
