import React from 'react';
import { useWorkspaceStore, Room } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Hash, Shield, Layers, Code, Zap, Globe, LogOut } from 'lucide-react';

export const RoomSidebar: React.FC = () => {
  const { rooms, currentRoom, selectRoom } = useWorkspaceStore();
  const { user, logout } = useAuthStore();

  const getRoomIcon = (name: string) => {
    if (name.toLowerCase().includes('mern')) return Code;
    if (name.toLowerCase().includes('php')) return Zap;
    if (name.toLowerCase().includes('common')) return Globe;
    return Layers;
  };

  return (
    <div className="flex h-full w-[72px] flex-col items-center justify-between border-r border-white/5 bg-dark-950 py-3 shrink-0">
      {/* Top Section: App Branding & Rooms */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Main Logo Icon */}
        <div className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:rounded-xl">
          <Shield className="h-6 w-6" />
          <div className="absolute left-16 z-50 hidden rounded-md bg-dark-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block whitespace-nowrap">
            Team Workspace
          </div>
        </div>

        <div className="h-[2px] w-8 rounded bg-white/10" />

        {/* Room Icons List */}
        <div className="flex flex-col gap-2.5 w-full items-center overflow-y-auto max-h-[calc(100vh-180px)] px-2">
          {rooms.map((room) => {
            const isSelected = currentRoom?._id === room._id;
            const IconComponent = getRoomIcon(room.name);

            return (
              <button
                key={room._id}
                onClick={() => selectRoom(room)}
                className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-brand-500 text-white rounded-xl shadow-md shadow-brand-500/20'
                    : 'bg-dark-900 text-gray-400 hover:bg-dark-800 hover:text-gray-200 hover:rounded-xl'
                }`}
              >
                {/* Active Indicator Bar */}
                {isSelected && (
                  <div className="absolute -left-2 h-8 w-1.5 rounded-r-full bg-white shadow-sm" />
                )}

                <IconComponent className="h-5 w-5" />

                {/* Tooltip */}
                <div className="absolute left-16 z-50 hidden rounded-md bg-dark-900 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block whitespace-nowrap">
                  <div>{room.name}</div>
                  <div className="text-[10px] text-gray-400 font-normal">
                    Allowed: {room.allowedRoles.join(', ')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: User Avatar & Logout */}
      <div className="flex flex-col items-center gap-3">
        <div className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-dark-850 border border-white/10 text-white">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name}`}
            alt={user?.name}
            className="h-8 w-8 rounded-lg object-cover"
          />
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-dark-950 bg-emerald-500" />

          {/* User Info Tooltip */}
          <div className="absolute left-16 z-50 hidden rounded-md bg-dark-900 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block whitespace-nowrap">
            <div>{user?.name}</div>
            <div className="text-[10px] text-brand-400 uppercase font-mono">{user?.role}</div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-900 text-gray-400 transition hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
