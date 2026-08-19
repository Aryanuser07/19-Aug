import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { socketService } from '../../services/socket';
import { Users, X, Lock, PhoneCall, Sparkles } from 'lucide-react';

interface BreakoutCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BreakoutCreatorModal: React.FC<BreakoutCreatorModalProps> = ({ isOpen, onClose }) => {
  const { onlinePresences, addToast, setActiveBreakout } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [breakoutName, setBreakoutName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const availableMembers = onlinePresences.filter((member) => {
    if (member.userId === user?.id) return false;
    if (member.status === 'in-breakout') return false;
    return true;
  });

  const toggleSelectMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleStartBreakout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberIds.length === 0) return;

    try {
      setIsLoading(true);
      const ack = await socketService.emitWithAck('admin:create_breakout', {
        memberIds: selectedMemberIds,
        breakoutName: breakoutName.trim() || undefined,
      });

      if (ack.success) {
        addToast({
          type: 'success',
          title: 'Breakout Session Launched',
          message: `Created isolated meeting '${ack.data?.breakoutName || 'Private Breakout'}'`,
        });
        setActiveBreakout({
          breakoutId: ack.data.breakoutId,
          breakoutName: ack.data.breakoutName,
        });
        onClose();
      } else {
        addToast({
          type: 'error',
          title: 'Breakout Failed',
          message: ack.message || 'Could not start breakout',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to trigger breakout event',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Private Mini-Meeting</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleStartBreakout} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Meeting Title</label>
            <input
              type="text"
              value={breakoutName}
              onChange={(e) => setBreakoutName(e.target.value)}
              placeholder="e.g. Architecture Sync #2"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
              Select Online Members ({selectedMemberIds.length} selected)
            </label>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 border border-white/10 rounded-xl bg-dark-800 p-2">
              {availableMembers.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500">
                  No online team members available to invite
                </div>
              ) : (
                availableMembers.map((member) => {
                  const isChecked = selectedMemberIds.includes(member.userId);
                  return (
                    <label
                      key={member.userId}
                      className={`flex items-center justify-between rounded-lg p-2 text-xs font-medium cursor-pointer transition ${
                        isChecked ? 'bg-brand-500/20 text-white' : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectMember(member.userId)}
                          className="rounded border-white/20 bg-dark-900 text-brand-500 focus:ring-0"
                        />
                        <span>{member.userName}</span>
                      </div>
                      <span className="text-[10px] text-brand-400 uppercase font-mono">{member.role}</span>
                    </label>
                  );
                })
              )}
            </div>
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
              disabled={selectedMemberIds.length === 0 || isLoading}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-500 disabled:opacity-50"
            >
              <PhoneCall className="h-4 w-4" />
              Launch Breakout Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Client Breakout Invitation Popup Modal
export const BreakoutInviteModal: React.FC = () => {
  const { breakoutInvite, setBreakoutInvite, setActiveBreakout } = useWorkspaceStore();

  if (!breakoutInvite) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-dark-900 p-6 shadow-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
          <Sparkles className="h-8 w-8 animate-bounce" />
        </div>

        <h3 className="mt-4 text-xl font-bold text-white">Private Mini-Meeting Invite</h3>
        <p className="mt-2 text-xs text-gray-300">
          Admin <span className="font-semibold text-amber-400">{breakoutInvite.createdBy}</span> has invited you to join{' '}
          <span className="font-semibold text-white">'{breakoutInvite.breakoutName}'</span>.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setBreakoutInvite(null)}
            className="rounded-xl border border-white/10 bg-dark-800 px-5 py-2.5 text-xs font-semibold text-gray-300 hover:bg-dark-700"
          >
            Decline
          </button>
          <button
            onClick={() => {
              setActiveBreakout({
                breakoutId: breakoutInvite.breakoutId,
                breakoutName: breakoutInvite.breakoutName,
                createdBy: breakoutInvite.createdBy,
              });
              setBreakoutInvite(null);
            }}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500"
          >
            <PhoneCall className="h-4 w-4" />
            Join Private Meeting
          </button>
        </div>
      </div>
    </div>
  );
};
