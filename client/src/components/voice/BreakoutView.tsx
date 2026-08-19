import React, { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore, ActiveBreakout } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWebRTC, RemoteParticipant } from '../../hooks/useWebRTC';
import { socketService } from '../../services/socket';
import { Lock, Mic, MicOff, Headphones, PhoneOff, Video, VideoOff, ShieldAlert, UserPlus, X, Send } from 'lucide-react';

export const BreakoutView: React.FC<{ breakout: ActiveBreakout }> = ({ breakout }) => {
  const { user } = useAuthStore();
  const { setActiveBreakout } = useWorkspaceStore();
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);

  const {
    localStream,
    remoteParticipants,
    isConnected,
    isMuted,
    isDeafened,
    isVideoOn,
    localVolume,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    toggleVideo,
  } = useWebRTC(undefined, breakout.breakoutId);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Auto-connect to WebRTC breakout call room on mount
  useEffect(() => {
    if (!isConnected) {
      joinVoice();
    }
  }, [breakout.breakoutId, isConnected, joinVoice]);

  useEffect(() => {
    if (localVideoRef.current && localStream && isVideoOn) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOn]);

  const handleLeaveBreakout = () => {
    leaveVoice();
    setActiveBreakout(null);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-dark-950 via-dark-900 to-dark-850">
      {/* Header Bar */}
      <div className="flex h-16 items-center justify-between border-b border-amber-500/20 bg-dark-900 px-6 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-wide">{breakout.breakoutName}</h3>
            <p className="text-[10px] text-amber-400 font-mono">Isolated Private Mini-Meeting</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Add Participants Button */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsAddMembersOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Participants</span>
            </button>
          )}

          <div className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 text-xs font-semibold text-amber-300">
            <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
            <span>Encrypted WebRTC Session</span>
          </div>
        </div>
      </div>

      {/* Grid of Audio/Video Participant Cards */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Local Participant Card */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-2xl border bg-dark-900/90 p-5 shadow-xl backdrop-blur-md transition ${
              localVolume > 15 && !isMuted
                ? 'border-amber-500/80 shadow-amber-500/20 pulse-speaking'
                : 'border-white/10'
            }`}
          >
            <div className="relative">
              {isVideoOn && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-24 w-32 rounded-xl object-cover border border-white/10"
                />
              ) : (
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name}`}
                  alt={user?.name}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-white/10 shadow-lg"
                />
              )}

              {isMuted && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow">
                  <MicOff className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            <div className="mt-3 text-center w-full">
              <h4 className="text-xs font-bold text-white truncate max-w-[140px] mx-auto">
                {user?.name} <span className="text-[10px] text-gray-400">(You)</span>
              </h4>

              {/* Dynamic Volume Level Bar */}
              <div className="mt-2 h-1.5 w-24 bg-dark-800 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${isMuted ? 0 : localVolume}%` }}
                />
              </div>
            </div>
          </div>

          {/* Remote Breakout Participants */}
          {remoteParticipants.map((participant) => (
            <BreakoutParticipantCard
              key={participant.socketId}
              participant={participant}
              isDeafened={isDeafened}
            />
          ))}
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex h-20 items-center justify-between border-t border-white/5 bg-dark-900 px-8 shrink-0">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="h-3 w-3 rounded-full bg-amber-500 animate-ping" />
          <span>Breakout Active ({remoteParticipants.length + 1} members)</span>
        </div>

        {/* Media Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition shadow-lg ${
              isMuted
                ? 'border-red-500/40 bg-red-500/20 text-red-400'
                : 'border-white/10 bg-dark-800 text-white hover:bg-dark-700'
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition shadow-lg ${
              isDeafened
                ? 'border-amber-500/40 bg-amber-500/20 text-amber-400'
                : 'border-white/10 bg-dark-800 text-white hover:bg-dark-700'
            }`}
          >
            <Headphones className="h-5 w-5" />
          </button>

          <button
            onClick={toggleVideo}
            title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition shadow-lg ${
              isVideoOn
                ? 'border-brand-500/40 bg-brand-500/20 text-brand-300'
                : 'border-white/10 bg-dark-800 text-white hover:bg-dark-700'
            }`}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          <button
            onClick={handleLeaveBreakout}
            title="Leave Private Meeting"
            className="flex h-12 px-6 items-center gap-2 rounded-2xl bg-red-600 font-semibold text-xs text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition"
          >
            <PhoneOff className="h-4 w-4" />
            Leave Breakout
          </button>
        </div>

        <div className="text-xs text-gray-500 font-mono">
          Private Room Mesh
        </div>
      </div>

      {/* Add Members Modal */}
      <AddBreakoutMembersModal
        isOpen={isAddMembersOpen}
        breakoutId={breakout.breakoutId}
        currentParticipants={remoteParticipants}
        onClose={() => setIsAddMembersOpen(false)}
      />
    </div>
  );
};

// Add Members Modal Component
const AddBreakoutMembersModal: React.FC<{ isOpen: boolean; breakoutId: string; currentParticipants: RemoteParticipant[]; onClose: () => void }> = ({
  isOpen,
  breakoutId,
  currentParticipants,
  onClose,
}) => {
  const { onlinePresences, addToast } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Filter out self and members already in a breakout session
  const availableMembers = onlinePresences.filter((member) => {
    if (member.userId === user?.id) return false;
    if (member.status === 'in-breakout') return false;
    if (currentParticipants.some((p) => p.user.id === member.userId)) return false;
    return true;
  });

  const toggleSelectMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleInviteMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberIds.length === 0) return;

    try {
      setIsLoading(true);
      const ack = await socketService.emitWithAck('admin:invite_to_breakout', {
        breakoutId,
        memberIds: selectedMemberIds,
      });

      if (ack.success) {
        addToast({
          type: 'success',
          title: 'Invites Sent',
          message: ack.message || 'Invited additional members to breakout meeting',
        });
        setSelectedMemberIds([]);
        onClose();
      } else {
        addToast({
          type: 'error',
          title: 'Invite Error',
          message: ack.message || 'Could not send meeting invites',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send breakout invites',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-dark-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Add Participants to Meeting</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleInviteMembers} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
              Select Online Team Members ({selectedMemberIds.length} selected)
            </label>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 border border-white/10 rounded-xl bg-dark-800 p-2">
              {availableMembers.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-500">
                  All online team members are already in a breakout or unavailable
                </div>
              ) : (
                availableMembers.map((member) => {
                  const isChecked = selectedMemberIds.includes(member.userId);
                  return (
                    <label
                      key={member.userId}
                      className={`flex items-center justify-between rounded-lg p-2 text-xs font-medium cursor-pointer transition ${
                        isChecked ? 'bg-amber-500/20 text-white' : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectMember(member.userId)}
                          className="rounded border-white/20 bg-dark-900 text-amber-500 focus:ring-0"
                        />
                        <span>{member.userName}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 uppercase font-mono">{member.role}</span>
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
              <Send className="h-4 w-4" />
              Send Invites
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Remote Breakout Participant Card
const BreakoutParticipantCard: React.FC<{ participant: RemoteParticipant; isDeafened: boolean }> = ({
  participant,
  isDeafened,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [hasVideoTrack, setHasVideoTrack] = useState(() => participant.stream.getVideoTracks().length > 0);

  useEffect(() => {
    const stream = participant.stream;
    const updateVideo = () => {
      const liveVideoTracks = stream.getVideoTracks().filter((t) => t.readyState === 'live' && t.enabled);
      const isVideoActive = liveVideoTracks.length > 0;
      setHasVideoTrack(isVideoActive);

      if (isVideoActive && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      if (!isVideoActive && audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(() => {});
      }
    };

    updateVideo();

    stream.addEventListener('addtrack', updateVideo);
    stream.addEventListener('removetrack', updateVideo);

    return () => {
      stream.removeEventListener('addtrack', updateVideo);
      stream.removeEventListener('removetrack', updateVideo);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [participant.stream, hasVideoTrack]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border bg-dark-900/90 p-5 shadow-xl backdrop-blur-md transition ${
        participant.volume > 15 ? 'border-amber-500/80 shadow-amber-500/20 pulse-speaking' : 'border-white/10'
      }`}
    >
      <div className="relative">
        {hasVideoTrack ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isDeafened}
            className="h-24 w-32 rounded-xl object-cover border border-white/10"
          />
        ) : (
          <>
            <audio ref={audioRef} autoPlay muted={isDeafened} />
            <img
              src={participant.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${participant.user.name}`}
              alt={participant.user.name}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-white/10 shadow-lg"
            />
          </>
        )}
      </div>

      <div className="mt-3 text-center w-full">
        <h4 className="text-xs font-bold text-white truncate max-w-[140px] mx-auto">{participant.user.name}</h4>

        {/* Dynamic Volume Level Bar */}
        <div className="mt-2 h-1.5 w-24 bg-dark-800 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-amber-400 transition-all duration-75" style={{ width: `${participant.volume}%` }} />
        </div>
      </div>
    </div>
  );
};
