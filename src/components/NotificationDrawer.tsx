import React from 'react';
import { Bell, X, AlertOctagon, Flame, ArrowRight, Radio } from 'lucide-react';
import { SystemNotification, Article } from '../types';

interface NotificationDrawerProps {
  onClose: () => void;
  notifications: SystemNotification[];
  onSelectArticle: (id: string) => void;
  onClearAll?: () => void;
}

export default function NotificationDrawer({
  onClose,
  notifications,
  onSelectArticle,
  onClearAll
}: NotificationDrawerProps) {
  
  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end" id="notification-drawer">
      {/* Click-out overlay target wrapper */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl border-l border-slate-100 flex flex-col justify-between overflow-hidden animate-slide-left">
        
        {/* Header Block */}
        <div>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2">
              <div className="p-1 px-2.5 bg-red-100 text-red-600 rounded-full flex items-center mb-0.5">
                <Radio className="h-4 w-4 animate-pulse mr-1" />
                <span className="text-[10px] font-bold font-mono tracking-wider uppercase">Live Update Hub</span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
              title="Close Panel"
              id="close-notif-drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List Content */}
          <div className="p-5 overflow-y-auto max-h-[80vh] space-y-4">
            <h3 className="font-display font-extrabold text-sm text-slate-900">Recent Alerts & Critical Updates</h3>
            
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400" id="empty-notifications">
                <Bell className="h-8 w-8 mx-auto stroke-1 text-slate-300 mb-2" />
                <p className="text-xs">No active alerts at the moment.</p>
                <p className="text-[10px] text-slate-400 mt-1">We will notify you immediately when breaking news arrives.</p>
              </div>
            ) : (
              <div className="space-y-3" id="notifications-list">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-xl border text-xs leading-relaxed transition-all relative ${
                      notif.type === 'breaking'
                        ? 'bg-red-50/50 border-red-100'
                        : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[9px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-full uppercase ${
                        notif.type === 'breaking'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {notif.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 mb-1">{notif.title}</h4>
                    <p className="text-slate-600 mb-2 leading-relaxed">{notif.message}</p>

                    {notif.articleId && (
                      <button
                        onClick={() => {
                          onSelectArticle(notif.articleId!);
                          onClose();
                        }}
                        className="flex items-center space-x-1 font-mono font-bold text-[10px] text-slate-900 hover:text-blue-600 border-b border-transparent hover:border-blue-500 transition-all cursor-pointer"
                      >
                        <span>Examine Story</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Bottom Section layout */}
        {notifications.length > 0 && onClearAll && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              onClick={onClearAll}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
            >
              Clear all read alerts
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
