import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon, 
  Target, 
  Eye, 
  Info,
  Layers,
  Award,
  Globe,
  Mail,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chapterHeadAPI } from '../../services/chapterHeadApi';
import Loader from '../common/Loader';
import ImageUploader from '../common/ImageUploader';
import { encodeS3Url } from '../../utils/s3Utils';

const EditChapterProfile: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const [formState, setFormState] = useState({
    about: '',
    mission: '',
    vision: '',
    posterImageUrl: '',
    galleryImageUrls: [] as string[],
    highlightsText: '',
    achievementsText: '',
    contact: '',
    socialLinksText: '',
    activeFrom: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    website: ''
  });

  useEffect(() => {
    if (!chapterId) return;

    const loadProfile = async () => {
      try {
        const result = await chapterHeadAPI.getChapterProfile(chapterId);
        const profile = result.profile || {};

        setFormState({
          about: profile.about || '',
          mission: profile.mission || '',
          vision: profile.vision || '',
          posterImageUrl: profile.posterImageUrl || '',
          galleryImageUrls: Array.isArray(profile.galleryImageUrls) ? profile.galleryImageUrls : [],
          highlightsText: (Array.isArray(profile.highlights) ? profile.highlights : []).join('\n'),
          achievementsText: (Array.isArray(profile.achievements) ? profile.achievements : []).join('\n'),
          contact: profile.contact || '',
          socialLinksText: '',
          activeFrom: profile.activeFrom || '',
          instagram: profile.socialLinks?.instagram || '',
          linkedin: profile.socialLinks?.linkedin || '',
          twitter: profile.socialLinks?.twitter || '',
          facebook: profile.socialLinks?.facebook || '',
          website: profile.socialLinks?.website || ''
        });
      } catch (err: any) {
        console.error('Error fetching chapter profile', err);
        setNotification({ type: 'error', message: err?.message || 'Unable to load chapter profile' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [chapterId]);

  const onFieldChange = (field: string, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const parseList = (text: string) => text.split('\n').map((it) => it.trim()).filter(Boolean);


  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterId) return;

    setSaving(true);

    try {
      const payload = {
        about: formState.about.trim(),
        mission: formState.mission.trim(),
        vision: formState.vision.trim(),
        posterImageUrl: formState.posterImageUrl.trim(),
        galleryImageUrls: formState.galleryImageUrls,
        highlights: parseList(formState.highlightsText),
        achievements: parseList(formState.achievementsText),
        contact: formState.contact.trim(),
        activeFrom: formState.activeFrom.trim(),
        socialLinks: {
          instagram: formState.instagram.trim(),
          linkedin: formState.linkedin.trim(),
          twitter: formState.twitter.trim(),
          facebook: formState.facebook.trim(),
          website: formState.website.trim()
        }
      };

      await chapterHeadAPI.updateChapterProfile(chapterId, payload);
      setNotification({ type: 'success', message: 'Chapter profile saved successfully!' });
      setTimeout(() => setNotification(null), 3500);
      setActiveTab('preview');
    } catch (err: any) {
      console.error('Failed to save chapter profile', err);
      setNotification({ type: 'error', message: err?.message || 'Failed to save chapter profile' });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    const newList = [...formState.galleryImageUrls];
    newList.splice(index, 1);
    onFieldChange('galleryImageUrls', newList);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader /></div>;
  }

  const posterPreview = formState.posterImageUrl 
    ? encodeS3Url(formState.posterImageUrl) 
    : 'https://via.placeholder.com/1200x800?text=Poster+Preview';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/head/chapters')} 
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Chapter About Page</h1>
              <p className="text-xs text-slate-500">Edit the information displayed to students</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'edit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Preview
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <AnimatePresence mode="wait">
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
                notification.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span className="font-medium">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'edit' ? (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Form Side */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={saveProfile} className="space-y-6">
                
                {/* Visuals Section (MOST IMPORTANT) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-800">Visuals & Branding</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <ImageUploader 
                      label="Main Poster Image"
                      currentImageUrl={formState.posterImageUrl}
                      onUploadSuccess={(url) => onFieldChange('posterImageUrl', url)}
                      onUploadUrlRequest={(fileName: string, contentType: string) => 
                        chapterHeadAPI.getProfileUploadUrl(chapterId!, fileName, contentType)
                      }
                      aspectRatio="3/2"
                      className="mb-8"
                    />

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-slate-700">Gallery Items</label>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{formState.galleryImageUrls.length} / 6 Images</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {formState.galleryImageUrls.map((url, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100 shadow-sm">
                            <img src={encodeS3Url(url)} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(idx)}
                              className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        
                        {formState.galleryImageUrls.length < 6 && (
                          <ImageUploader 
                            onUploadSuccess={(url) => {
                              if (url) onFieldChange('galleryImageUrls', [...formState.galleryImageUrls, url]);
                            }}
                            onUploadUrlRequest={(fileName: string, contentType: string) => 
                              chapterHeadAPI.getProfileUploadUrl(chapterId!, fileName, contentType)
                            }
                            aspectRatio="1/1"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* About Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Info className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-800">Basic Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">About the Chapter</label>
                      <textarea
                        value={formState.about}
                        onChange={(e) => onFieldChange('about', e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm leading-relaxed"
                        rows={6}
                        placeholder="Welcome students! Describe what makes your chapter special, your community culture, and what kind of projects or events you focus on..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Active From (Year)</label>
                        <input 
                          value={formState.activeFrom} 
                          onChange={(e) => onFieldChange('activeFrom', e.target.value)} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm"
                          placeholder="e.g. 2023"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Mission</label>
                        <textarea 
                          value={formState.mission} 
                          onChange={(e) => onFieldChange('mission', e.target.value)} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm leading-relaxed"
                          placeholder="Our immediate goals..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Vision</label>
                        <textarea 
                          value={formState.vision} 
                          onChange={(e) => onFieldChange('vision', e.target.value)} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm leading-relaxed"
                          placeholder="Our long-term impact..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Achievements Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Award className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-800">Highlights & Achievements</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Highlights (One per line)</label>
                      <textarea 
                        value={formState.highlightsText} 
                        onChange={(e) => onFieldChange('highlightsText', e.target.value)} 
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm" 
                        rows={3} 
                        placeholder="Team of 50+ members&#10;In-person meetups&#10;Industry-grade projects"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Achievements (One per line)</label>
                      <textarea 
                        value={formState.achievementsText} 
                        onChange={(e) => onFieldChange('achievementsText', e.target.value)} 
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm" 
                        rows={3} 
                        placeholder="Best Regional Chapter 2024&#10;3 Successful Hackathons&#10;100+ Internships facilitated"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                      <Globe className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-800">Contact & Socials</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Email/Link</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input 
                          value={formState.contact} 
                          onChange={(e) => onFieldChange('contact', e.target.value)} 
                          className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm" 
                          placeholder="head@example.org" 
                        />
                      </div>
                    </div>
                    <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Instagram URL</label>
                        <input 
                          value={formState.instagram} 
                          onChange={(e) => onFieldChange('instagram', e.target.value)} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm" 
                          placeholder="https://instagram.com/yourchapter" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">LinkedIn URL</label>
                        <input 
                          value={formState.linkedin} 
                          onChange={(e) => onFieldChange('linkedin', e.target.value)} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm" 
                          placeholder="https://linkedin.com/company/yourchapter" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Twitter/X URL</label>
                        <input 
                          value={formState.twitter} 
                          onChange={(e) => onFieldChange('twitter', e.target.value)} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm" 
                          placeholder="https://twitter.com/yourchapter" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Website URL</label>
                        <input 
                          value={formState.website} 
                          onChange={(e) => onFieldChange('website', e.target.value)} 
                          className="w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm" 
                          placeholder="https://yourchapter.org" 
                        />
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 pb-12">
                  <p className="text-xs text-slate-500 italic flex flex-col gap-1">
                    <span>* Changes take effect immediately on student dashboard after save.</span>
                    <span>* Optimal poster size: 3:2 aspect ratio.</span>
                  </p>
                  <div className="flex gap-3 px-4">
                    <button 
                      type="button" 
                      onClick={() => navigate('/head/chapters')} 
                      className="px-6 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all flex items-center gap-2 disabled:opacity-70 whitespace-nowrap"
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="h-5 w-5" />
                      )}
                      {saving ? 'Publishing...' : 'Save & Publish'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Sticky Helper Side */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-400" />
                    How this helps
                  </h4>
                  <ul className="space-y-4">
                    <li className="flex gap-3 text-xs leading-relaxed text-slate-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <span>Visual profiles builds trust and identity for your chapter.</span>
                    </li>
                    <li className="flex gap-3 text-xs leading-relaxed text-slate-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <span>Students check the "About" page before registering.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-hidden">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Visual Snapshot
                  </h4>
                  <div className="rounded-xl overflow-hidden border border-slate-100 aspect-[3/2] bg-slate-50 shadow-inner">
                    <img 
                      src={posterPreview} 
                      alt="Chapter Poster Preview" 
                      className="w-full h-full object-cover transition-all"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x800?text=Upload+Image+URL';
                      }}
                    />
                  </div>
                  <p className="mt-3 text-[10px] text-slate-500 font-medium">Auto-generated preview of your hero image</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col mb-20">
              <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CHAPTER INFO PREVIEW</span>
              </div>
              
              <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                {formState.posterImageUrl && (
                  <div className="relative h-72 w-full overflow-hidden rounded-2xl shadow-xl">
                    <img 
                      src={formState.posterImageUrl} 
                      alt="Live Preview Poster" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  </div>
                )}
                
                <div className="space-y-4">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none group flex items-center gap-3">
                    <span className="h-10 w-2 bg-blue-600 rounded-full" />
                    About our Chapter
                  </h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line text-lg font-medium opacity-90">
                    {formState.about || 'Provide an overview of your chapter to see the simulation...'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  {formState.mission && (
                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm">
                      <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Our Mission
                      </h4>
                      <p className="text-sm text-blue-700 leading-relaxed font-medium whitespace-pre-line">{formState.mission}</p>
                    </div>
                  )}
                  {formState.vision && (
                    <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100 shadow-sm">
                      <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Our Vision
                      </h4>
                      <p className="text-sm text-purple-700 leading-relaxed font-medium whitespace-pre-line">{formState.vision}</p>
                    </div>
                  )}
                </div>

                {(parseList(formState.highlightsText).length > 0 || parseList(formState.achievementsText).length > 0) && (
                  <div className="space-y-6 pt-4">
                    <div className="h-px bg-slate-100 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {parseList(formState.highlightsText).length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest opacity-40">Chapter Highlights</h4>
                          <div className="flex flex-wrap gap-2">
                            {parseList(formState.highlightsText).map((it, idx) => (
                              <span key={idx} className="bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-slate-100">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                {it}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {parseList(formState.achievementsText).length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-900 uppercase text-xs tracking-widest opacity-40">Notable Achievements</h4>
                          <ul className="space-y-2">
                            {parseList(formState.achievementsText).map((it, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 font-medium leading-relaxed">
                                <Award className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                {it}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-8 bg-slate-50 border-t flex flex-col items-center gap-4">
                <button 
                  onClick={() => setActiveTab('edit')}
                  className="px-10 py-3 bg-white border border-slate-200 text-slate-800 rounded-2xl font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all uppercase tracking-widest text-xs"
                >
                  Back to Editor
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EditChapterProfile;
