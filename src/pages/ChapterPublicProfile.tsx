import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Target, 
  Eye, 
  Award, 
  CheckCircle, 
  Instagram,
  Linkedin,
  Twitter,
  Globe,
  Users,
  Sparkles,
  Globe2
} from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { chapterHeadAPI } from '../services/chapterHeadApi';
import Loader from '../components/common/Loader';
import PublicProfileLayout from '../components/profiles/PublicProfileLayout';
import { useTheme } from '../contexts/ThemeContext';
import { encodeS3Url } from '../utils/s3Utils';

const ChapterPublicProfile: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const profileRef = useRef<HTMLDivElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCloseProfile = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/student/chapters');
  };

  useEffect(() => {
    if (!chapterId) return;

    const loadProfile = async () => {
      try {
        const result = await chapterHeadAPI.getChapterProfile(chapterId);
        setProfile(result.profile);
        setChapter(result.chapter);
      } catch (err: any) {
        console.error('Failed to load profile', err);
        setError(err.message || 'Unable to load chapter details');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [chapterId]);

  if (loading) return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-slate-50'}`}><Loader /></div>;
  
  if (error || !profile) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDark ? 'bg-dark-bg' : 'bg-slate-50'}`}>
        <div className={`${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-slate-100'} p-8 rounded-3xl shadow-xl border max-w-md`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>
            <Target className="h-8 w-8" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Profile Not found</h2>
          <p className={`mb-6 ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>{error || "This chapter hasn't set up their profile yet."}</p>
          <button 
            onClick={() => navigate('/student/chapters')}
            className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${isDark ? 'bg-accent-600 hover:bg-accent-700 shadow-accent-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} text-white`}
          >
            Back to Chapters
          </button>
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    if (!profileRef.current) return;
    
    setIsCapturing(true);
    await new Promise(r => setTimeout(r, 100));

    try {
      const canvas = await html2canvas(profileRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: isDark ? '#0f172a' : '#fcfdfd',
        ignoreElements: (element) => {
          return element.classList.contains('no-capture');
        }
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      
      const canShareFiles =
        !!blob &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [new File([blob], 'profile.png', { type: 'image/png' })] });

      if (blob && navigator.share && canShareFiles) {
        const file = new File([blob], `${chapter?.chapterName || 'chapter'}-profile.png`, { type: 'image/png' });
        await navigator.share({
          title: `${chapter?.chapterName} Profile`,
          text: `Check out the ${chapter?.chapterName} chapter on Unify!`,
          files: [file],
        });
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${chapter?.chapterName || 'chapter'}-profile.png`;
        link.click();
        URL.revokeObjectURL(url);
        
        await navigator.clipboard.writeText(window.location.href);
        alert('Image downloaded and link copied to clipboard!');
      } else {
        await navigator.share({
          title: chapter?.chapterName,
          url: window.location.href
        });
      }
    } catch (err) {
      console.error('Error sharing profile', err);
      try {
        await navigator.share({ url: window.location.href });
      } catch (sErr) {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const parseList = (list: any) => Array.isArray(list) ? list : (list ? [list] : []);

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram className="h-5 w-5" />;
      case 'linkedin': return <Linkedin className="h-5 w-5" />;
      case 'twitter': return <Twitter className="h-5 w-5" />;
      case 'website': return <Globe className="h-5 w-5" />;
      default: return <Globe className="h-5 w-5" />;
    }
  };

  return (
    <PublicProfileLayout
      isDark={isDark}
      profileRef={profileRef}
      posterImageUrl={profile.posterImageUrl}
      posterAlt="Chapter Banner"
      badgeText="University Chapter"
      title={chapter?.chapterName || chapter?.name || profile?.chapterName || profile?.name || 'Our Community'}
      metaContent={(
        <>
          <span className="flex items-center gap-2.5 text-lg"><MapPin className="h-5 w-5 text-blue-500" /> {chapter?.city || chapter?.state || 'Unify Network'}</span>
          <span className="flex items-center gap-2.5 text-lg"><Users className="h-5 w-5 text-indigo-500" /> {chapter?.memberCount ? `${chapter.memberCount}+ members` : 'Open student community'}</span>
          {chapter?.isPaid ? (
            <span className="flex items-center gap-2.5 text-lg text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <span className="text-sm">₹</span>
              {chapter.registrationFee > 0 ? `Paid (₹${chapter.registrationFee / 100})` : 'Free'}
            </span>
          ) : (
            <span className="flex items-center gap-2.5 text-lg text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200">
              <span className="text-sm">₹</span> Free
            </span>
          )}
        </>
      )}
      ctaLabel="Join Our Network"
      onCtaClick={() => navigate('/student/chapters')}
      closeLabel="Close Profile"
      onClose={handleCloseProfile}
      socialLinks={profile.socialLinks}
      getSocialIcon={getSocialIcon}
      isCapturing={isCapturing}
      onShare={handleShare}
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
                  <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{chapter?.collegeName || chapter?.universityName || 'University Network'}</p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Community</p>
                  <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{chapter?.memberCount ? `${chapter.memberCount}+ builders` : 'Open to all students'}</p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="p-4 bg-emerald-600 rounded-3xl text-white shadow-xl shadow-emerald-500/20">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Focus</p>
                  <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{profile?.mission ? 'Innovation and leadership' : 'Student growth and impact'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {profile.galleryImageUrls && profile.galleryImageUrls.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`lg:col-span-3 p-8 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 h-full">
                {profile.galleryImageUrls.map((url: string, idx: number) => (
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
              {profile.about || "This chapter is dedicated to fostering community and growth within our student network."}
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
                {profile.mission || "Empowering students through innovation."}
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
                {profile.vision || "Leading global hub for builders."}
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
              {parseList(profile.highlights).length > 0 ? (
                parseList(profile.highlights).map((item: string, idx: number) => (
                  <div key={idx} className={`flex items-start gap-4 p-6 rounded-[2rem] border font-bold text-sm transition-all ${isDark ? 'bg-dark-bg/50 border-dark-border/50 text-dark-text-secondary hover:bg-dark-bg/70' : 'bg-slate-50/30 border-slate-100/50 text-slate-700 shadow-sm hover:bg-slate-50/50'}`}>
                    <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 font-bold text-slate-300 italic">No markers yet</div>
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
              {parseList(profile.achievements).length > 0 ? (
                parseList(profile.achievements).map((item: string, idx: number) => (
                  <div key={idx} className={`flex items-start gap-5 p-6 border-l-8 border-amber-500/80 rounded-r-[2.5rem] rounded-l-md font-bold text-sm transition-all ${isDark ? 'bg-amber-500/5 text-dark-text-secondary border-amber-500/20 hover:bg-amber-500/10' : 'bg-amber-50/40 shadow-sm text-amber-950 border-amber-100/50 hover:bg-amber-50/50'}`}>
                    <Award className="h-6 w-6 text-amber-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 font-bold text-slate-300 italic">Future milestones</div>
              )}
            </div>
          </motion.div>
    </PublicProfileLayout>
  );
};

export default ChapterPublicProfile;
