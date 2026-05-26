import React, { useState } from 'react';
import { Plus, Edit, Trash2, ShieldAlert, Sparkles, Search, Filter } from 'lucide-react';
import { Article } from '../../types';
import { getUITranslation, Language } from '../../utils/translation';

interface AdminCMSProps {
  articles: Article[];
  onRefreshArticles: () => void;
  onSelectArticle: (articleId: string) => void;
  language: Language;
  setGlobalSuccessMsg: (msg: string) => void;
  fetchAnalytics: () => void;
}

export default function AdminCMS({
  articles,
  onRefreshArticles,
  onSelectArticle,
  language,
  setGlobalSuccessMsg,
  fetchAnalytics
}: AdminCMSProps) {
  const lang = language;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // CMS forms
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // CMS article fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState<'Politics' | 'Technology' | 'Business' | 'Sports' | 'Science' | 'Entertainment'>('Technology');
  const [source, setSource] = useState('Marathi Fast News');
  const [imageUrl, setImageUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [location, setLocation] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'standard'>('image');
  const [cmsError, setCmsError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSaveCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setCmsError('');

    if (!title.trim() || !content.trim() || !author.trim() || !source.trim()) {
      setCmsError(getUITranslation("cms_required_error", lang) || (lang === 'mr' ? "सर्व आवश्यक फील्ड्स भरणे बंधनकारक आहे." : "All required core fields must be fulfilled."));
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim() || undefined,
      category,
      source: source.trim(),
      imageUrl: imageUrl.trim() || undefined,
      author: author.trim(),
      isBreaking,
      videoUrl: videoUrl.trim() || undefined,
      location: location.trim() || undefined,
      mediaType
    };

    const url = editingId ? `/api/articles/${editingId}` : '/api/articles';
    const method = editingId ? 'PUT' : 'POST';

    try {
      setSubmitting(true);
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Execution failed inside the news CMS.");
      }

      setGlobalSuccessMsg(editingId 
        ? (lang === 'mr' ? "लेख यशस्वीरित्या अद्यतनित करण्यात आला." : "Article was updated successfully.")
        : (lang === 'mr' ? "नवीन वृत्तांत यशस्वीरित्या प्रसारित करण्यात आला!" : "New report was broadcasted successfully.")
      );
      
      // Clear states
      resetForm();
      onRefreshArticles();
      fetchAnalytics();
    } catch (err: any) {
      setCmsError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSummary('');
    setImageUrl('');
    setAuthor('');
    setIsBreaking(false);
    setVideoUrl('');
    setLocation('');
    setMediaType('image');
    setEditingId(null);
    setCreating(false);
    setCmsError('');
  };

  const handleEditTrigger = (art: Article) => {
    setEditingId(art.id);
    setTitle(art.title);
    setContent(art.content);
    setSummary(art.summary || '');
    setCategory(art.category as any);
    setSource(art.source);
    setImageUrl(art.imageUrl);
    setAuthor(art.author);
    setIsBreaking(!!art.isBreaking);
    setVideoUrl(art.videoUrl || '');
    setLocation(art.location || '');
    setMediaType(art.mediaType || 'image');
    setCreating(true);
    setCmsError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteArticle = async (id: string) => {
    const confirmMsg = lang === 'mr'
      ? "तुम्हाला खात्री आहे का की तुम्ही हा लेख मुख्य फीडवरून काढून टाकू इच्छिता?"
      : "Are you absolutely sure you wish to suspend and delete this article from active feeds?";
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/articles/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setGlobalSuccessMsg(lang === 'mr' ? "लेख यशस्वीरित्या काढून टाकला गेला." : "Article was removed successfully.");
        onRefreshArticles();
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setCmsError('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            filename: file.name,
            base64Data
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to upload image to GitHub.");
        }

        const { url } = await res.json();
        setImageUrl(url);
      } catch (err: any) {
        setCmsError(err.message || "An error occurred during upload");
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredArticles = articles.filter(art => {
    const matchesSearch = (art.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (art.author || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || art.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="newsroom-cms-module">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="cms-section-controls">
        <div>
          <h3 className="font-display font-extrabold text-lg text-slate-900">
            {getUITranslation("active_editorial_inv", lang)}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {getUITranslation("edit_reports_desc", lang)}
          </p>
        </div>

        <button
          onClick={() => {
            if (creating) {
              resetForm();
            } else {
              setCreating(true);
            }
          }}
          className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl text-sm hover:bg-slate-800 transition-all flex items-center space-x-2 cursor-pointer shadow-md self-start sm:self-auto"
        >
          {creating ? (
             <span className="font-bold">{getUITranslation("cancel", lang)}</span>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>{getUITranslation("compose_new_story", lang)}</span>
            </>
          )}
        </button>
      </div>

      {/* Create / Edit Form Interface */}
      {creating && (
        <form onSubmit={handleSaveCMS} className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden animate-fade-in" id="cms-form">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h4 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">
              {editingId ? getUITranslation("update_specs", lang) : getUITranslation("broadcasting_specs", lang)}
            </h4>
          </div>

          <div className="p-6 space-y-6">
            {cmsError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center space-x-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <span>{cmsError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Metadata */}
              <div className="space-y-5 lg:col-span-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">
                    {getUITranslation("field_category_lbl", lang)}
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800"
                  >
                    <option value="Technology">{getUITranslation("category_technology", lang)}</option>
                    <option value="Politics">{getUITranslation("category_politics", lang)}</option>
                    <option value="Business">{getUITranslation("category_business", lang)}</option>
                    <option value="Sports">{getUITranslation("category_sports", lang)}</option>
                    <option value="Science">{getUITranslation("category_science", lang)}</option>
                    <option value="Entertainment">{getUITranslation("category_entertainment", lang)}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">
                    {getUITranslation("field_author_lbl", lang)}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Prof. Linda Jenkins"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">
                    {getUITranslation("field_source_lbl", lang)}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. AP Wire, Science Journal"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">
                    Location Tags
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Mumbai, Pune, Nagpur"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Media Format
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" name="mediaType" value="image" checked={mediaType === 'image'} onChange={() => setMediaType('image')} className="text-slate-900 focus:ring-slate-900" />
                      <span className="text-sm font-bold text-slate-700">Image Article</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" name="mediaType" value="video" checked={mediaType === 'video'} onChange={() => setMediaType('video')} className="text-slate-900 focus:ring-slate-900" />
                      <span className="text-sm font-bold text-slate-700">Video Article</span>
                    </label>
                  </div>
                  
                  {mediaType === 'image' && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-white p-2 border border-slate-200 rounded-lg">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            disabled={uploadingImage}
                          />
                        </label>
                        {uploadingImage && (
                          <span className="flex items-center text-xs font-bold text-blue-600 animate-pulse px-2">
                            <span className="inline-block h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1.5" />
                            Uploading to GitHub...
                          </span>
                        )}
                      </div>
                      
                      {imageUrl && (
                        <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group">
                          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-mono break-all px-4 text-center">{imageUrl}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {mediaType === 'video' && (
                    <div>
                      <input
                        type="text"
                        placeholder="Video Embed URL (https://www.youtube.com/embed/...)"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-red-50/50 border border-red-100 rounded-xl">
                  <input
                    type="checkbox"
                    id="make-breaking"
                    checked={isBreaking}
                    onChange={(e) => setIsBreaking(e.target.checked)}
                    className="h-5 w-5 rounded border-red-200 text-red-600 focus:ring-red-600"
                  />
                  <label htmlFor="make-breaking" className="text-sm font-bold text-red-700 cursor-pointer select-none">
                    {getUITranslation("make_breaking_lbl", lang)}
                  </label>
                </div>
              </div>

              {/* Right Column: Content */}
              <div className="space-y-5 lg:col-span-2">
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      {getUITranslation("field_title_lbl", lang)}
                    </label>
                    <span className={`text-[10px] font-mono ${title.length > 100 ? 'text-red-500' : 'text-slate-400'}`}>
                      {title.length}/120
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter an engaging headline..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:font-normal placeholder:text-base"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      {getUITranslation("field_content_lbl", lang)}
                    </label>
                  </div>
                  <textarea
                    required
                    rows={12}
                    placeholder={lang === 'mr' ? "मुख्य वृत्ताचा संपूर्ण मजकूर येथे लिहा..." : "Write the full article content here..."}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800 font-serif resize-y"
                  />
                </div>

                {/* Summary field */}
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                        {getUITranslation("field_summary_lbl", lang)}
                      </label>
                      <span className={`text-[10px] font-mono ${summary.length > 250 ? 'text-amber-500' : 'text-slate-400'}`}>
                        {summary.length} chars
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    placeholder={lang === 'mr' ? "मुख्य कथेचा उत्कृष्ट लहान सारांश येथे लिहा..." : "Write a concise summary brief..."}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800 font-sans"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
            >
              {getUITranslation("cancel", lang)}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-1.5 transition-all ${
                submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 cursor-pointer'
              }`}
            >
              {submitting && (
                <span className="inline-block h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
              )}
              <span>{editingId ? getUITranslation("apply_mod_btn", lang) : getUITranslation("issue_pub_btn", lang)}</span>
            </button>
          </div>
        </form>
      )}

      {/* CMS Inventory Records List */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={lang === 'mr' ? "लेख शोधा..." : "Search articles..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-700 w-full sm:w-auto"
            >
              <option value="All">{lang === 'mr' ? "सर्व श्रेणी" : "All Categories"}</option>
              <option value="Technology">{getUITranslation("category_technology", lang)}</option>
              <option value="Politics">{getUITranslation("category_politics", lang)}</option>
              <option value="Business">{getUITranslation("category_business", lang)}</option>
              <option value="Sports">{getUITranslation("category_sports", lang)}</option>
              <option value="Science">{getUITranslation("category_science", lang)}</option>
              <option value="Entertainment">{getUITranslation("category_entertainment", lang)}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                <th className="p-4 pl-6 w-2/5">{getUITranslation("col_report_desc", lang)}</th>
                <th className="p-4">{getUITranslation("col_topic", lang)}</th>
                <th className="p-4">{lang === 'mr' ? 'स्थिती' : 'Status'}</th>
                <th className="p-4">{getUITranslation("col_stats", lang)}</th>
                <th className="p-4 pr-6 text-right">{getUITranslation("col_curation", lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-sm font-medium">
                    {lang === 'mr' ? 'कोणतेही लेख आढळले नाहीत.' : 'No articles found matching criteria.'}
                  </td>
                </tr>
              ) : (
                filteredArticles.map(art => {
                  const mappedCategory = getUITranslation("category_" + art.category.toLowerCase(), lang);
                  const pubDate = new Date(art.publishedAt);
                  return (
                    <tr key={art.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Description column */}
                      <td className="p-4 pl-6">
                        <div className="flex items-start space-x-4">
                          <img
                            src={art.imageUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-14 w-20 object-cover rounded-xl bg-slate-100 shrink-0 border border-slate-200/50"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                          <div>
                            <span 
                              onClick={() => onSelectArticle(art.id)}
                              className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-2 leading-tight"
                            >
                              {art.title}
                            </span>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-medium mt-1.5">
                              <span>{getUITranslation("by", lang)} {art.author}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-[10px]">{pubDate.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold uppercase rounded-md text-[10px] tracking-wider font-mono">
                          {mappedCategory}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                           {art.isBreaking && (
                             <span className="w-max px-2 py-0.5 bg-red-100 text-red-700 font-bold uppercase rounded text-[9px] tracking-wider font-mono">
                               {lang === 'mr' ? 'ब्रेकिंग' : 'Breaking'}
                             </span>
                           )}
                           {art.videoUrl && (
                             <span className="w-max px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold uppercase rounded text-[9px] tracking-wider font-mono">
                               {lang === 'mr' ? 'व्हिडिओ' : 'Video'}
                             </span>
                           )}
                           {!art.isBreaking && !art.videoUrl && (
                             <span className="text-[11px] text-slate-400 font-medium">Standard</span>
                           )}
                        </div>
                      </td>

                      <td className="p-4 font-mono text-xs text-slate-500">
                        <div className="flex flex-col gap-1">
                          <span className="flex justify-between w-16"><span>Views:</span> <span className="text-slate-700 font-bold">{art.views}</span></span>
                          <span className="flex justify-between w-16"><span>Likes:</span> <span className="text-slate-700 font-bold">{art.likes}</span></span>
                        </div>
                      </td>

                      {/* Action buttons panel */}
                      <td className="p-4 pr-6 text-right align-middle">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditTrigger(art)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                            title={lang === 'mr' ? "संपादित करा" : "Edit Report"}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArticle(art.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100"
                            title={lang === 'mr' ? "काढून टाका" : "Delete Story"}
                          >
                            <Trash2 className="h-4 w-4" />
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
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500 font-medium">
          <span>Showing {filteredArticles.length} of {articles.length} articles</span>
        </div>
      </div>
    </div>
  );
}
