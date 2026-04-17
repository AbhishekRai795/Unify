import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon, 
  MapPin,
  Users,
  Sparkles,
  Globe2,
  Target, 
  Eye, 
  Info,
  Award,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Mail,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chapterHeadAPI } from '../../services/chapterHeadApi';
import Loader from '../common/Loader';
import ImageUploader from './../common/ImageUploader';
import PublicProfileLayout from '../profiles/PublicProfileLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { encodeS3Url } from '../../utils/s3Utils';

const EditChapterProfile: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const profilePreviewRef = useRef<HTMLDivElement>(null);

  const pageClass = isDark ? 'bg-dark-bg' : 'bg-[#F8FAFC]';
  const headerClass = isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-slate-200';
  const panelClass = isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-slate-200';
  const panelTitleClass = isDark ? 'text-dark-text-primary' : 'text-slate-800';
  const labelClass = isDark ? 'text-dark-text-secondary' : 'text-slate-700';
  const inputClass = isDark
    ? 'w-full p-3 border border-dark-border rounded-xl bg-dark-bg text-dark-text-secondary focus:ring-4 focus:ring-accent-500/15 focus:border-accent-500 transition-all outline-none text-sm'
    : 'w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm';
  const textareaClass = isDark
    ? 'w-full p-3 border border-dark-border rounded-xl bg-dark-bg text-dark-text-secondary focus:ring-4 focus:ring-accent-500/15 focus:border-accent-500 transition-all outline-none text-sm leading-relaxed'
    : 'w-full p-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-600 text-sm leading-relaxed';
  const tabWrapClass = isDark ? 'bg-dark-bg border border-dark-border/60' : 'bg-slate-100';
  const tabIdleClass = isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900';
  const tabActiveClass = isDark ? 'bg-dark-surface text-accent-400 border border-dark-border/60 shadow-sm' : 'bg-white text-blue-600 shadow-sm';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [chapterData, setChapterData] = useState<any>(null);

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
        setChapterData(result.chapter || null);

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

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className="h-5 w-5" />;
      case 'linkedin':
        return <Linkedin className="h-5 w-5" />;
      case 'twitter':
        return <Twitter className="h-5 w-5" />;
      case 'website':
        return <Globe className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const handlePreviewShare = async () => {
    const profileUrl = `${window.location.origin}${window.location.pathname.replace('/head/chapters/edit-profile/', '/chapters/profile/')}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setNotification({ type: 'success', message: 'Public chapter profile link copied to clipboard!' });
      setTimeout(() => setNotification(null), 2500);
    } catch {
      setNotification({ type: 'error', message: 'Unable to copy link. Share from public page.' });
      setTimeout(() => setNotification(null), 2500);
    }
  };


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
    return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}><Loader /></div>;
  }

  const previewHighlights = parseList(formState.highlightsText);
  const previewAchievements = parseList(formState.achievementsText);
  const previewProfile = {
    about: formState.about,
    mission: formState.mission,
    vision: formState.vision,
    posterImageUrl: formState.posterImageUrl,
    galleryImageUrls: formState.galleryImageUrls,
    highlights: previewHighlights,
    achievements: previewAchievements,
    socialLinks: {
      instagram: formState.instagram,
      linkedin: formState.linkedin,
      twitter: formState.twitter,
      website: formState.website,
      facebook: formState.facebook,
    },
  };

  return (
    <div className={`min-h-screen pb-20 ${pageClass}`}>
      {/* Header Section */}
      <div className={`border-b sticky top-0 z-30 ${headerClass}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/head/chapters')} 
              className={`group flex items-center text-sm font-medium transition-all duration-200 ${isDark ? 'text-dark-text-secondary hover:text-dark-text-primary' : 'text-slate-600 hover:text-slate-900'}`}
              title="Back to Dashboard"
            >
              <div className={`p-2 mr-2 rounded-lg border transition-all ${isDark ? 'bg-dark-bg border-dark-border group-hover:border-accent-500/50 group-hover:bg-accent-600/10' : 'bg-white border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50'}`}>
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              </div>
              Back to Dashboard
            </button>
            <div className={`h-8 w-px mx-2 invisible sm:visible ${isDark ? 'bg-dark-border' : 'bg-slate-200'}`}></div>
            <div>
              <h1 className={`text-lg font-bold leading-tight ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Chapter About Page</h1>
              <p className={`text-xs ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>Edit the information displayed to students</p>
            </div>
          </div>

          <div className={`flex items-center gap-2 p-1 rounded-lg ${tabWrapClass}`}>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'edit' ? tabActiveClass : tabIdleClass
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'preview' ? tabActiveClass : tabIdleClass
              }`}
            >
              Live Preview
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 pt-8">
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
            className="grid grid-cols-1 xl:grid-cols-4 gap-8"
          >
            {/* Visuals Sidebar (1 Column) */}
            <div className="xl:col-span-1 space-y-6">
              <div className={`p-6 rounded-2xl shadow-sm border ${panelClass}`}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <h3 className={`font-bold ${panelTitleClass}`}>Visuals & Branding</h3>
                </div>
                
                <div className="space-y-6">
                  <ImageUploader 
                    label="Main Poster Image"
                    currentImageUrl={formState.posterImageUrl}
                    onUploadSuccess={(url: string) => onFieldChange('posterImageUrl', url)}
                    onUploadUrlRequest={(fileName: string, contentType: string) => 
                      chapterHeadAPI.getProfileUploadUrl(chapterId!, fileName, contentType)
                    }
                    aspectRatio="3/2"
                    className="mb-8"
                  />

                  <div className={`space-y-4 pt-4 border-t ${isDark ? 'border-dark-border/70' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <label className={`block text-sm font-semibold ${labelClass}`}>Gallery Items</label>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>{formState.galleryImageUrls.length} / 6</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {formState.galleryImageUrls.map((url, idx) => (
                        <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden group border shadow-sm ${isDark ? 'border-dark-border/70' : 'border-slate-100'}`}>
                          <img src={encodeS3Url(url)} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      
                      {formState.galleryImageUrls.length < 6 && (
                        <ImageUploader 
                          onUploadSuccess={(url: string | null) => {
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
            </div>

            {/* Form Content (3 Columns) */}
            <div className="xl:col-span-3">
              <form onSubmit={saveProfile} className="space-y-6">
                {/* Basic Info Grid */}
                <div className={`p-6 rounded-2xl shadow-sm border ${panelClass}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Info className="h-4 w-4" />
                    </div>
                    <h3 className={`font-bold ${panelTitleClass}`}>Basic Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-semibold mb-1 ${labelClass}`}>About the Chapter</label>
                      <textarea
                        value={formState.about}
                        onChange={(e) => onFieldChange('about', e.target.value)}
                        className={textareaClass}
                        rows={5}
                        placeholder="Welcome students! Describe what makes your chapter special..."
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${labelClass}`}>Active From (Year)</label>
                      <input 
                        value={formState.activeFrom} 
                        onChange={(e) => onFieldChange('activeFrom', e.target.value)} 
                        className={inputClass}
                        placeholder="e.g. 2023"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${labelClass}`}>Mission</label>
                      <textarea 
                        value={formState.mission} 
                        onChange={(e) => onFieldChange('mission', e.target.value)} 
                        className={textareaClass}
                        placeholder="Immediate goals..."
                        rows={4}
                      />
                    </div>
                    
                    <div className="md:col-span-1">
                      <label className={`block text-sm font-semibold mb-1 ${labelClass}`}>Vision</label>
                      <textarea 
                        value={formState.vision} 
                        onChange={(e) => onFieldChange('vision', e.target.value)} 
                        className={textareaClass}
                        placeholder="Long-term impact..."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                {/* Grid for Highlights, Achievements, Contacts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Achievements */}
                  <div className={`p-6 rounded-2xl shadow-sm border ${panelClass}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Award className="h-4 w-4" />
                      </div>
                      <h3 className={`font-bold ${panelTitleClass}`}>Highlights & Achievements</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-semibold mb-1 ${labelClass}`}>Highlights (One per line)</label>
                        <textarea 
                          value={formState.highlightsText} 
                          onChange={(e) => onFieldChange('highlightsText', e.target.value)} 
                          className={textareaClass} 
                          rows={4} 
                          placeholder="Team of 50+ members..."
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold mb-1 ${labelClass}`}>Achievements (One per line)</label>
                        <textarea 
                          value={formState.achievementsText} 
                          onChange={(e) => onFieldChange('achievementsText', e.target.value)} 
                          className={textareaClass} 
                          rows={4} 
                          placeholder="Best Regional Chapter..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact & Socials */}
                  <div className={`p-6 rounded-2xl shadow-sm border ${panelClass}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                        <Globe className="h-4 w-4" />
                      </div>
                      <h3 className={`font-bold ${panelTitleClass}`}>Contact & Socials</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-sm font-semibold mb-1 ${labelClass}`}>Contact Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <input 
                            value={formState.contact} 
                            onChange={(e) => onFieldChange('contact', e.target.value)} 
                            className={`${inputClass} pl-10 p-2.5`} 
                            placeholder="head@example.org" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input 
                            value={formState.instagram} 
                            onChange={(e) => onFieldChange('instagram', e.target.value)} 
                            className={`${inputClass} p-2.5`} 
                            placeholder="Instagram" 
                          />
                        </div>
                        <div>
                          <input 
                            value={formState.linkedin} 
                            onChange={(e) => onFieldChange('linkedin', e.target.value)} 
                            className={`${inputClass} p-2.5`} 
                            placeholder="LinkedIn" 
                          />
                        </div>
                        <div>
                          <input 
                            value={formState.twitter} 
                            onChange={(e) => onFieldChange('twitter', e.target.value)} 
                            className={`${inputClass} p-2.5`} 
                            placeholder="Twitter" 
                          />
                        </div>
                        <div>
                          <input 
                            value={formState.website} 
                            onChange={(e) => onFieldChange('website', e.target.value)} 
                            className={`${inputClass} p-2.5`} 
                            placeholder="Website" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 pb-12">
                  <p className={`text-[10px] italic ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>
                    Changes take effect immediately on student dashboard after save.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => navigate('/head/chapters')} 
                      className={`px-6 py-2.5 rounded-xl font-semibold transition-colors ${isDark ? 'text-dark-text-secondary hover:bg-dark-bg' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-70"
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
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <PublicProfileLayout
              isDark={isDark}
              profileRef={profilePreviewRef}
              posterImageUrl={previewProfile.posterImageUrl}
              posterAlt="Chapter Banner Preview"
              badgeText="University Chapter"
              title={chapterData?.chapterName || chapterData?.name || 'Our Community'}
              metaContent={(
                <>
                  <span className="flex items-center gap-2.5 text-lg"><MapPin className="h-5 w-5 text-blue-500" /> {chapterData?.city || chapterData?.state || 'Unify Network'}</span>
                  <span className="flex items-center gap-2.5 text-lg"><Users className="h-5 w-5 text-indigo-500" /> {chapterData?.memberCount ? `${chapterData.memberCount}+ members` : 'Open student community'}</span>
                </>
              )}
              ctaLabel="Join Our Network"
              onCtaClick={() => {}}
              closeLabel="Back to Editor"
              onClose={() => setActiveTab('edit')}
              socialLinks={previewProfile.socialLinks}
              getSocialIcon={getSocialIcon}
              isCapturing={false}
              onShare={handlePreviewShare}
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`lg:col-span-3 p-8 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                      <Globe2 className="h-7 w-7" />
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Campus Presence</p>
                      <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{chapterData?.collegeName || chapterData?.universityName || 'University Network'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                      <Users className="h-7 w-7" />
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Community</p>
                      <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{chapterData?.memberCount ? `${chapterData.memberCount}+ builders` : 'Open to all students'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-emerald-600 rounded-3xl text-white shadow-xl shadow-emerald-500/20">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <div>
                      <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Focus</p>
                      <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{previewProfile.mission ? 'Innovation and leadership' : 'Student growth and impact'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {previewProfile.galleryImageUrls && previewProfile.galleryImageUrls.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={`lg:col-span-3 p-8 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 h-full">
                    {previewProfile.galleryImageUrls.map((url: string, idx: number) => (
                      <div key={idx} className={`aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-slate-100/50 border ${isDark ? 'border-dark-border/60' : 'border-white/40'}`}>
                        <img src={encodeS3Url(url)} alt={`Gallery ${idx}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`lg:col-span-2 p-12 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
              >
                <h2 className={`text-4xl font-black mb-8 flex items-center gap-5 ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>
                  <div className="h-10 w-2 bg-blue-600 rounded-full" />
                  Our Collective Story
                </h2>
                <p className={`text-xl leading-relaxed whitespace-pre-line font-medium opacity-90 ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
                  {previewProfile.about || 'This chapter is dedicated to fostering community and growth within our student network.'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`p-10 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl space-y-10 transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
              >
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3.5 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                      <Target className="h-6 w-6" />
                    </div>
                    <h4 className={`text-2xl font-black ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Mission</h4>
                  </div>
                  <p className={`text-base leading-relaxed font-semibold ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                    {previewProfile.mission || 'Empowering students through innovation.'}
                  </p>
                </div>
                <div className={`pt-10 border-t ${isDark ? 'border-dark-border/40' : 'border-slate-100/70'}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3.5 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                      <Eye className="h-6 w-6" />
                    </div>
                    <h4 className={`text-2xl font-black ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Vision</h4>
                  </div>
                  <p className={`text-base leading-relaxed font-semibold ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                    {previewProfile.vision || 'Leading global hub for builders.'}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={`p-12 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl h-full transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
              >
                <h3 className={`font-black text-xs uppercase tracking-[0.3em] mb-10 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Highlights</h3>
                <div className="space-y-5">
                  {previewHighlights.length > 0 ? (
                    previewHighlights.map((item: string, idx: number) => (
                      <div key={idx} className={`flex items-start gap-4 p-6 rounded-[2rem] border font-bold text-sm transition-all ${isDark ? 'bg-dark-bg/50 border-dark-border/50 text-dark-text-secondary hover:bg-dark-bg/70' : 'bg-slate-50/30 border-slate-100/50 text-slate-700 shadow-sm hover:bg-slate-50/50'}`}>
                        <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-10 font-bold italic ${isDark ? 'text-dark-text-muted' : 'text-slate-300'}`}>No markers yet</div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className={`p-12 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl h-full transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
              >
                <h3 className={`font-black text-xs uppercase tracking-[0.3em] mb-10 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Achievements</h3>
                <div className="space-y-5">
                  {previewAchievements.length > 0 ? (
                    previewAchievements.map((item: string, idx: number) => (
                      <div key={idx} className={`flex items-start gap-5 p-6 border-l-8 border-amber-500/80 rounded-r-[2.5rem] rounded-l-md font-bold text-sm transition-all ${isDark ? 'bg-amber-500/5 text-dark-text-secondary border-amber-500/20 hover:bg-amber-500/10' : 'bg-amber-50/40 shadow-sm text-amber-950 border-amber-100/50 hover:bg-amber-50/50'}`}>
                        <Award className="h-6 w-6 text-amber-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-10 font-bold italic ${isDark ? 'text-dark-text-muted' : 'text-slate-300'}`}>Future milestones</div>
                  )}
                </div>
              </motion.div>
            </PublicProfileLayout>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EditChapterProfile;
