import React, { useState } from 'react';
import api from '../../services/api';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { X, Hash, Volume2, Video } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ isOpen, onClose, roomId }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice' | 'video'>('text');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentRoom, selectRoom, addToast } = useWorkspaceStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsLoading(true);
      await api.post(`/rooms/${roomId}/channels`, {
        name: name.trim(),
        type,
        description,
      });

      addToast({
        type: 'success',
        title: 'Channel Created',
        message: `Created #${name.trim()} in ${currentRoom?.name}`,
      });

      setName('');
      setDescription('');
      setIsLoading(false);
      onClose();

      // Refresh channels for current room
      if (currentRoom) {
        selectRoom(currentRoom);
      }
    } catch (err: any) {
      setIsLoading(false);
      addToast({
        type: 'error',
        title: 'Error Creating Channel',
        message: err.response?.data?.message || 'Failed to create channel',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-900 p-6 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Create Channel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Channel Type</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition ${
                  type === 'text'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-white/10 bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                <Hash className="h-5 w-5" />
                Text
              </button>
              <button
                type="button"
                onClick={() => setType('voice')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition ${
                  type === 'voice'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/10 bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                <Volume2 className="h-5 w-5" />
                Voice
              </button>
              <button
                type="button"
                onClick={() => setType('video')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition ${
                  type === 'video'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-white/10 bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                <Video className="h-5 w-5" />
                Video
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. architecture-sync"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Topic or channel purpose"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-dark-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-dark-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
