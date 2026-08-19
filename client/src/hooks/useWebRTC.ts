import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { AudioAnalyzer } from '../services/audioAnalyzer';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface RemoteParticipant {
  socketId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  stream: MediaStream;
  volume: number;
}

export const useWebRTC = (channelId?: string, breakoutId?: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [localVolume, setLocalVolume] = useState(0);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const remoteAnalyzersRef = useRef<Map<string, AudioAnalyzer>>(new Map());
  const activeRoomKey = useRef<string | null>(null);
  
  // Tracks which peer connections have completed their initial offer/answer
  // exchange, so onnegotiationneeded only fires for genuine later renegotiations
  // (e.g. toggling video mid-call) and never conflicts with the manual
  // initial-join offer/answer flow.
  const initialNegotiationDone = useRef<Set<string>>(new Set());

  const { addToast } = useWorkspaceStore();

  // Helper to create and setup RTCPeerConnection
  const createPeerConnection = useCallback((targetSocketId: string, currentLocalStream: MediaStream | null) => {
    if (peerConnections.current.has(targetSocketId)) {
      return peerConnections.current.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(targetSocketId, pc);

    // Add local tracks to peer connection
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentLocalStream);
      });
    }

    // ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emitWithAck('webrtc:signal', {
          targetSocketId,
          signal: { candidate: event.candidate },
          breakoutId,
          channelId,
        });
      }
    };

    // Remote track handler
    pc.ontrack = (event) => {
      const incomingTrack = event.track;

      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId);

        const stream = event.streams[0] || existing?.stream || new MediaStream();
        if (!stream.getTracks().some((t) => t.id === incomingTrack.id)) {
          stream.addTrack(incomingTrack);
        }

        // Create a FRESH MediaStream instance so React state change is detected!
        const freshStream = new MediaStream(stream.getTracks());

        next.set(targetSocketId, {
          socketId: targetSocketId,
          user: existing?.user || { id: targetSocketId, name: 'Peer', email: '', role: 'common' },
          stream: freshStream,
          volume: existing?.volume || 0,
        });
        return next;
      });

      // Attach audio analyzer for remote volume level
      if (!remoteAnalyzersRef.current.has(targetSocketId)) {
        const stream = event.streams[0] || new MediaStream([incomingTrack]);
        const analyzer = new AudioAnalyzer(stream, (vol) => {
          setRemoteParticipants((prev) => {
            const next = new Map(prev);
            const p = next.get(targetSocketId);
            if (p) {
              next.set(targetSocketId, { ...p, volume: vol });
            }
            return next;
          });
        });
        remoteAnalyzersRef.current.set(targetSocketId, analyzer);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeerConnection(targetSocketId);
      }
    };

    // Handles mid-call renegotiation (e.g. when video is toggled on after
    // the initial offer/answer exchange already completed). Guarded so it
    // never fires during initial connection setup — that would conflict
    // with the manual offer/answer flow in joinVoice / handleSignalReceived.
    pc.onnegotiationneeded = async () => {
      if (!initialNegotiationDone.current.has(targetSocketId)) return;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await socketService.emitWithAck('webrtc:signal', {
          targetSocketId,
          signal: offer,
          breakoutId,
          channelId,
        });
      } catch (err) {
        console.error('Renegotiation offer error:', err);
      }
    };

    return pc;
  }, [channelId, breakoutId]);

  const closePeerConnection = useCallback((socketId: string) => {
    const pc = peerConnections.current.get(socketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(socketId);
    }

    initialNegotiationDone.current.delete(socketId);

    const analyzer = remoteAnalyzersRef.current.get(socketId);
    if (analyzer) {
      analyzer.stop();
      remoteAnalyzersRef.current.delete(socketId);
    }

    setRemoteParticipants((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
  }, []);

  // Join Voice Room & Media Capture
  const joinVoice = useCallback(async () => {
    if (!channelId && !breakoutId) return;

    try {
      // 1. Audio-only media capture by default (Refinement 3)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Start local audio analyzer
      localAnalyzerRef.current = new AudioAnalyzer(stream, (vol) => {
        setLocalVolume(vol);
      });

      // 2. Join voice room on backend & receive existing participants list (Refinement 2)
      const ack = await socketService.emitWithAck('webrtc:join_voice_room', {
        channelId,
        breakoutId,
      });

      if (!ack.success) {
        addToast({
          type: 'error',
          title: 'Voice Join Error',
          message: ack.message || 'Could not join voice lounge',
        });
        return;
      }

      activeRoomKey.current = ack.data?.roomKey || null;
      const existingParticipants: string[] = ack.data?.existingParticipants || [];
      setIsConnected(true);

      // 3. Initiate RTCPeerConnection offer to existing participants (Refinement 2)
      for (const targetSocketId of existingParticipants) {
        const pc = createPeerConnection(targetSocketId, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await socketService.emitWithAck('webrtc:signal', {
          targetSocketId,
          signal: offer,
          breakoutId,
          channelId,
        });

        // Initial manual offer sent — future addTrack() calls on this
        // connection can now safely trigger automatic renegotiation.
        initialNegotiationDone.current.add(targetSocketId);
      }
    } catch (err: any) {
      console.error('Media stream or WebRTC join error:', err);
      addToast({
        type: 'warning',
        title: 'Microphone Access Required',
        message: 'Please allow microphone access to participate in voice calls',
      });
    }
  }, [channelId, breakoutId, createPeerConnection, addToast]);

  // Leave Voice Room & Cleanup
  const leaveVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (localAnalyzerRef.current) {
      localAnalyzerRef.current.stop();
      localAnalyzerRef.current = null;
    }

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    initialNegotiationDone.current.clear();

    remoteAnalyzersRef.current.forEach((a) => a.stop());
    remoteAnalyzersRef.current.clear();

    setRemoteParticipants(new Map());
    setIsConnected(false);

    if (channelId || breakoutId || activeRoomKey.current) {
      const socket = socketService.getSocket();
      socket?.emit('webrtc:leave_voice_room', { channelId, breakoutId, roomKey: activeRoomKey.current });
      activeRoomKey.current = null;
    }
  }, [channelId, breakoutId]);

  // Clean up WebRTC connection when switching channels or breakout rooms
  useEffect(() => {
    return () => {
      leaveVoice();
    };
  }, [channelId, breakoutId, leaveVoice]);

  // Socket Signal & Disconnect Event Listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleUserConnected = async (data: { socketId: string; user: any }) => {
      const pc = createPeerConnection(data.socketId, localStreamRef.current);
      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        next.set(data.socketId, {
          socketId: data.socketId,
          user: data.user,
          stream: new MediaStream(),
          volume: 0,
        });
        return next;
      });
    };

    const handleUserDisconnected = (data: { socketId: string }) => {
      closePeerConnection(data.socketId);
    };

    const handleSignalReceived = async (data: { senderSocketId: string; signal: any; user: any }) => {
      const { senderSocketId, signal, user } = data;

      let pc = peerConnections.current.get(senderSocketId);
      if (!pc) {
        pc = createPeerConnection(senderSocketId, localStreamRef.current);
      }

      if (user) {
        setRemoteParticipants((prev) => {
          const next = new Map(prev);
          const existing = next.get(senderSocketId);
          next.set(senderSocketId, {
            socketId: senderSocketId,
            user,
            stream: existing?.stream || new MediaStream(),
            volume: existing?.volume || 0,
          });
          return next;
        });
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socketService.emitWithAck('webrtc:signal', {
            targetSocketId: senderSocketId,
            signal: answer,
            breakoutId,
            channelId,
          });

          // Initial handshake complete on the answerer side — future
          // addTrack() calls can now safely trigger renegotiation.
          initialNegotiationDone.current.add(senderSocketId);
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('WebRTC signal handling error:', err);
      }
    };

    socket.on('webrtc:user_connected', handleUserConnected);
    socket.on('webrtc:user_disconnected', handleUserDisconnected);
    socket.on('webrtc:signal_received', handleSignalReceived);

    return () => {
      socket.off('webrtc:user_connected', handleUserConnected);
      socket.off('webrtc:user_disconnected', handleUserDisconnected);
      socket.off('webrtc:signal_received', handleSignalReceived);
    };
  }, [createPeerConnection, closePeerConnection, breakoutId, channelId]);

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = isMuted)); // invert current muted state
      setIsMuted(!isMuted);
    }
  };

  // Toggle Deafen
  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };

  // Toggle Video (Opt-in video, Refinement 3)
  const toggleVideo = async () => {
    if (!localStreamRef.current) return;

    if (isVideoOn) {
      // Turn off video track
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.stop();
        localStreamRef.current?.removeTrack(t);
      });
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setIsVideoOn(false);
    } else {
      // Turn on camera
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (videoTrack) {
          localStreamRef.current.addTrack(videoTrack);
          peerConnections.current.forEach((pc) => {
            pc.addTrack(videoTrack, localStreamRef.current!);
          });
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          setIsVideoOn(true);
        }
      } catch (err) {
        addToast({
          type: 'warning',
          title: 'Camera Access Error',
          message: 'Could not enable camera feed',
        });
      }
    }
  };

  return {
    localStream,
    remoteParticipants: Array.from(remoteParticipants.values()),
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
  };
};
