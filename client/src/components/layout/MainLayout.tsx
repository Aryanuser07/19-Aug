import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { RoomSidebar } from '../navigation/RoomSidebar';
import { ChannelSidebar } from '../navigation/ChannelSidebar';
import { ChatView } from '../chat/ChatView';
import { VoiceChannelView } from '../voice/VoiceChannelView';
import { PresencePanel } from '../presence/PresencePanel';
import { AdminDragDropDashboard } from '../admin/AdminDragDropDashboard';
import { BreakoutCreatorModal, BreakoutInviteModal } from '../admin/BreakoutModal';
import { ToastContainer } from '../common/ToastContainer';
import { Shield, PhoneCall, LayoutDashboard, MessageSquare } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const { currentRoom, currentChannel, fetchRooms, setupSocketListeners } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [isAdminDashboardView, setIsAdminDashboardView] = useState(false);
  const [isBreakoutModalOpen, setIsBreakoutModalOpen] = useState(false);

  useEffect(() => {
    fetchRooms();
    setupSocketListeners();
  }, []);

  const isAdmin = user?.role === 'admin';
  const isVoiceChannel = currentChannel?.type === 'voice' || currentChannel?.type === 'video';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-950 text-gray-100">
      {/* 1. Leftmost Room/Server Sidebar */}
      <RoomSidebar />

      {/* 2. Channel Sidebar */}
      <ChannelSidebar />

      {/* 3. Main Center Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Workspace Top Header Bar */}
        <div className="flex h-14 items-center justify-between border-b border-white/5 bg-dark-900 px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-white tracking-wide">
              {currentRoom?.name} <span className="text-gray-500 font-normal">/</span> {currentChannel ? `#${currentChannel.name}` : 'Overview'}
            </h1>
          </div>

          {/* Admin Tools Header Controls */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdminDashboardView(!isAdminDashboardView)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  isAdminDashboardView
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-white/10 bg-dark-800 text-gray-300 hover:bg-dark-700'
                }`}
              >
                {isAdminDashboardView ? <MessageSquare className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                {isAdminDashboardView ? 'Chat View' : 'Drag & Drop Dashboard'}
              </button>

              <button
                onClick={() => setIsBreakoutModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Start Breakout
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Center Main View */}
        <div className="flex-1 overflow-hidden">
          {isAdminDashboardView ? (
            <AdminDragDropDashboard />
          ) : isVoiceChannel ? (
            <VoiceChannelView />
          ) : (
            <ChatView />
          )}
        </div>
      </div>

      {/* 4. Rightmost Presence Panel */}
      <PresencePanel />

      {/* Global Modals & Toasts */}
      <BreakoutCreatorModal
        isOpen={isBreakoutModalOpen}
        onClose={() => setIsBreakoutModalOpen(false)}
      />
      <BreakoutInviteModal />
      <ToastContainer />
    </div>
  );
};
