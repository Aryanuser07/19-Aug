import React, { useState } from 'react';
import { useWorkspaceStore, Channel } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Hash, Volume2, Video, Plus, ChevronDown, Settings } from 'lucide-react';
import { CreateChannelModal } from './CreateChannelModal';

export const ChannelSidebar: React.FC = () => {
  const { currentRoom, channels, currentChannel, selectChannel } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice' || c.type === 'video');

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-full w-60 flex-col border-r border-white/5 bg-dark-900 shrink-0">
      {/* Room Header */}
      <div className="flex h-14 items-center justify-between border-b border-white/5 px-4 shadow-sm">
        <h2 className="font-bold text-white tracking-wide truncate">{currentRoom?.name || 'Workspace'}</h2>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              title="Add Channel"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
        {/* Text Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            <span>Text Channels ({textChannels.length})</span>
          </div>

          <div className="space-y-0.5">
            {textChannels.map((channel) => {
              const isSelected = currentChannel?._id === channel._id;
              return (
                <button
                  key={channel._id}
                  onClick={() => selectChannel(channel)}
                  className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-brand-600/20 text-brand-300 font-semibold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <Hash className={`h-4 w-4 shrink-0 ${isSelected ? 'text-brand-400' : 'text-gray-500'}`} />
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice & Video Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            <span>Voice & Video ({voiceChannels.length})</span>
          </div>

          <div className="space-y-0.5">
            {voiceChannels.map((channel) => {
              const isSelected = currentChannel?._id === channel._id;
              const IconComponent = channel.type === 'video' ? Video : Volume2;

              return (
                <button
                  key={channel._id}
                  onClick={() => selectChannel(channel)}
                  className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <IconComponent className={`h-4 w-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <span className="truncate">{channel.name}</span>
                  {isSelected && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Trigger for Admin */}
      {currentRoom && (
        <CreateChannelModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          roomId={currentRoom._id}
        />
      )}
    </div>
  );
};
