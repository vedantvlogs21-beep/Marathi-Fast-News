import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { User } from '../../types';
import { getUITranslation, Language } from '../../utils/translation';

interface AdminUsersProps {
  currentUser: User | null;
  usersList: User[];
  loadingUsers: boolean;
  fetchUsers: () => void;
  fetchAnalytics: () => void;
  language: Language;
  setGlobalSuccessMsg: (msg: string) => void;
}

export default function AdminUsers({
  currentUser,
  usersList,
  loadingUsers,
  fetchUsers,
  fetchAnalytics,
  language,
  setGlobalSuccessMsg
}: AdminUsersProps) {
  const lang = language;
  const [searchQuery, setSearchQuery] = useState('');

  const handleAlterUserRole = async (id: string, currentRole: 'admin' | 'user') => {
    const targetRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.ok) {
        setGlobalSuccessMsg(lang === 'mr' ? "वापरकर्ता अधिकार यशस्वीरित्या बदलले." : "Account privileges custom altered.");
        fetchUsers();
        fetchAnalytics();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSuspendUser = async (id: string) => {
    if (id === currentUser?.id) {
      alert(lang === 'mr' 
        ? "तुम्ही स्वतःचे वाचक सत्र निलंबित करू शकत नाही." 
        : "You cannot suspend your own administrative session."
      );
      return;
    }
    const confirmMsg = lang === 'mr'
      ? "वापरकर्ता प्रोफाइल निलंबित करण्याची पुष्टी करा. त्यांना तात्काळ लॉगआउट केले जाईल."
      : "Confirm suspension of reader account. They will be locked out immediately.";
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setGlobalSuccessMsg(lang === 'mr' ? "वापरकर्ता प्रोफाइल बंद करण्यात आले." : "User profile closed.");
        fetchUsers();
        fetchAnalytics();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Helper to generate consistent avatar colors based on username
  const getAvatarColor = (username: string) => {
    const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-blue-600', 'bg-purple-600'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredUsers = usersList.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" id="users-module">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-extrabold text-lg text-slate-900">
            {lang === 'mr' ? "नोंदणीकृत वाचक आणि कर्मचारी गट" : "Registered Reader & Staff Profiles"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'mr' ? "वापरकर्ता अधिकार बदला, किंवा मार्गदर्शक तत्वांचे उल्लंघन केल्यास प्रोफाइल निलंबित करा." : "Modify credentials, change authority metrics, or suspend accounts when guidelines are breached."}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={lang === 'mr' ? "वापरकर्ता शोधा (नाव किंवा ईमेल)..." : "Search users by username or email..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
        </div>

        {loadingUsers ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-medium">
              {getUITranslation("updating_profiles", lang) || "Loading profiles..."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  <th className="p-4 pl-6">{getUITranslation("col_profile_info", lang)}</th>
                  <th className="p-4">{getUITranslation("col_email", lang)}</th>
                  <th className="p-4">{getUITranslation("col_role", lang)}</th>
                  <th className="p-4">{getUITranslation("col_interests", lang)}</th>
                  <th className="p-4 pr-6 text-right font-semibold">{getUITranslation("col_actions", lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-sm font-medium">
                      {lang === 'mr' ? 'कोणतेही वापरकर्ते आढळले नाहीत.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const translatedRole = u.role === 'admin' 
                      ? (lang === 'mr' ? "प्रशासक" : "Admin")
                      : (lang === 'mr' ? "वाचक" : "Reader");

                    // Calculate relative date (simplified)
                    const joinedDate = new Date(u.registeredAt);
                    const monthsAgo = Math.floor((new Date().getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                    let joinedText = monthsAgo > 0 ? `${monthsAgo}mo ago` : "Recently";
                    if (lang === 'mr') joinedText = joinedDate.toLocaleDateString();

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        <td className="p-4 pl-6">
                          <div className="flex items-center space-x-3">
                            <div className={`h-10 w-10 text-white rounded-full flex items-center justify-center font-bold text-sm uppercase shadow-sm ${getAvatarColor(u.username)}`}>
                              {u.username.slice(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900">{u.username}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Joined: {joinedText}
                                </p>
                                <span className="text-slate-300">•</span>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {u.savedArticles?.length || 0} Saved
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 font-mono select-all text-xs text-slate-500">
                          {u.email}
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono ${
                            u.role === 'admin'
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {translatedRole}
                          </span>
                        </td>

                        <td className="p-4 max-w-[200px]">
                          <div className="flex flex-wrap gap-1.5">
                            {u.interests && u.interests.length > 0 ? (
                              u.interests.slice(0,3).map((i, idx) => {
                                const term = getUITranslation("category_" + i.toLowerCase(), lang);
                                return (
                                  <span key={idx} className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 rounded-md text-[10px]">
                                    {term}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-slate-400 italic text-xs">
                                {getUITranslation("no_preferences_text", lang)}
                              </span>
                            )}
                            {u.interests && u.interests.length > 3 && (
                               <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-md text-[10px]">
                                 +{u.interests.length - 3}
                               </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleAlterUserRole(u.id, u.role)}
                              className="px-3 py-1.5 text-[10px] font-bold font-mono uppercase bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer rounded-lg transition-colors shadow-sm"
                              title={lang === 'mr' ? "भूमिका बदला" : "Change privilege levels"}
                            >
                              {getUITranslation("role_permute_btn", lang) || "Toggle Role"}
                            </button>

                            <button
                              onClick={() => handleSuspendUser(u.id)}
                              className="px-3 py-1.5 text-[10px] font-bold font-mono uppercase bg-red-50 text-red-700 hover:bg-red-100 rounded-lg cursor-pointer transition-colors shadow-sm"
                              title={lang === 'mr' ? "प्रमाणपत्र बंद करा" : "Suspend user's profile"}
                            >
                              {getUITranslation("suspend_btn", lang) || "Suspend"}
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
