import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { socketService } from '../../services/socket';
import { Hash, Send, Paperclip, Smile } from 'lucide-react';

export const ChatView: React.FC = () => {
  const { currentChannel, currentRoom, messages, addToast } = useWorkspaceStore();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || !currentChannel || isSending) return;

    try {
      setIsSending(true);
      setInputText('');

      const ack = await socketService.emitWithAck('chat:send_message', {
        channelId: currentChannel._id,
        content,
      });

      if (!ack.success) {
        addToast({
          type: 'error',
          title: 'Message Delivery Failed',
          message: ack.message || 'Could not send message',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to deliver message',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!currentChannel) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Select a channel to start communicating
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-dark-850">
      {/* Channel Header Bar */}
      <div className="flex h-14 items-center gap-2 border-b border-white/5 bg-dark-900 px-6 shadow-sm shrink-0">
        <Hash className="h-5 w-5 text-gray-400" />
        <h3 className="font-bold text-white tracking-wide">{currentChannel.name}</h3>
        {currentChannel.description && (
          <>
            <span className="h-4 w-[1px] bg-white/10 mx-2" />
            <span className="text-xs text-gray-400 truncate">{currentChannel.description}</span>
          </>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {/* Channel Welcome Header */}
        <div className="mb-6 rounded-2xl bg-dark-900/60 p-6 border border-white/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400">
            <Hash className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-xl font-bold text-white">Welcome to #{currentChannel.name}!</h2>
          <p className="mt-1 text-xs text-gray-400">
            This is the start of the #{currentChannel.name} channel in {currentRoom?.name}.
          </p>
        </div>

        {messages.map((msg) => {
          const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={msg._id} className="group flex items-start gap-3 hover:bg-white/[0.02] p-1.5 rounded-xl transition">
              <img
                src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.senderName}`}
                alt={msg.senderName}
                className="h-9 w-9 rounded-xl object-cover border border-white/10 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-white leading-none">{msg.senderName}</span>
                  <span className="text-[10px] text-gray-500">{formattedTime}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-200 break-words whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div className="p-4 bg-dark-900 border-t border-white/5 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3 rounded-xl bg-dark-800 border border-white/10 px-4 py-2.5 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message #${currentChannel.name}...`}
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-500 disabled:opacity-30 disabled:hover:bg-brand-600 shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
