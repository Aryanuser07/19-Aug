import React, { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore, ActiveBreakout } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWebRTC, RemoteParticipant } from '../../hooks/useWebRTC';
import { Lock, Mic, MicOff, Headphones, PhoneOff, Video, VideoOff, ShieldAlert } from 'lucide-react';

export const BreakoutView: React.FC<{ breakout: ActiveBreakout }> = ({ breakout }) => {
  const { user } = useAuthStore();
  const { setActiveBreakout } = useWorkspaceStore();

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

        <div className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 text-xs font-semibold text-amber-300">
          <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
          <span>Encrypted WebRTC Session</span>
        </div>
      </div>

      {/* Grid of Audio/Video Participant Cards */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
      setHasVideoTrack(liveVideoTracks.length > 0);

      if (videoRef.current && stream && liveVideoTracks.length > 0) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      if (audioRef.current && stream) {
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
    };
  }, [participant.stream, hasVideoTrack]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border bg-dark-900/90 p-5 shadow-xl backdrop-blur-md transition ${
        participant.volume > 15 ? 'border-amber-500/80 shadow-amber-500/20 pulse-speaking' : 'border-white/10'
      }`}
    >
      {/* Remote Audio Track Element */}
      <audio ref={audioRef} autoPlay muted={isDeafened} />

      <div className="relative">
        {hasVideoTrack ? (
          <video ref={videoRef} autoPlay playsInline className="h-24 w-32 rounded-xl object-cover border border-white/10" />
        ) : (
          <img
            src={participant.user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${participant.user.name}`}
            alt={participant.user.name}
            className="h-20 w-20 rounded-2xl object-cover border-2 border-white/10 shadow-lg"
          />
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
