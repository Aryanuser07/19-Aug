import React from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Users, Circle, Shield, Code, Zap } from 'lucide-react';

export const PresencePanel: React.FC = () => {
  const { onlinePresences } = useWorkspaceStore();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">ADMIN</span>;
      case 'mern-dev':
        return <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">MERN</span>;
      case 'php-dev':
        return <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">PHP</span>;
      default:
        return <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">COMMON</span>;
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-l border-white/5 bg-dark-900 shrink-0">
      {/* Panel Header */}
      <div className="flex h-14 items-center gap-2 border-b border-white/5 px-4 shadow-sm">
        <Users className="h-4 w-4 text-brand-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Online Members ({onlinePresences.length})</h3>
      </div>

      {/* Online Users List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {onlinePresences.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            No active team members online
          </div>
        ) : (
          onlinePresences.map((member) => {
            const isCall = member.status === 'in-call';
            const isBreakout = member.status === 'in-breakout';

            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-dark-850 p-2.5 transition hover:bg-dark-800"
              >
                <div className="relative">
                  <img
                    src={member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.userName}`}
                    alt={member.userName}
                    className="h-8 w-8 rounded-lg object-cover border border-white/10"
                  />
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-dark-850 ${
                      isCall ? 'bg-emerald-500 animate-pulse' : isBreakout ? 'bg-amber-500' : 'bg-emerald-400'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{member.userName}</span>
                    {getRoleBadge(member.role)}
                  </div>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="truncate">
                      {member.currentChannelName ? `#${member.currentChannelName}` : 'Online'}
                    </span>
                    {member.connectionCount > 1 && (
                      <span className="rounded bg-white/10 px-1 font-mono text-[9px] text-gray-300">
                        {member.connectionCount} tabs
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
