import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Target,
  Award,
  Instagram,
  Linkedin,
  Twitter,
  Globe,
  Users,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { chapterHeadAPI } from '../services/chapterHeadApi';
import Loader from '../components/common/Loader';
import PublicProfileLayout from '../components/profiles/PublicProfileLayout';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';

const EventPublicProfile: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const profileRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCloseProfile = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/student/events');
  };

  useEffect(() => {
    if (!eventId) return;

    const loadProfile = async () => {
      try {
        const result = await chapterHeadAPI.getEventProfile(eventId);
        setProfile(result.profile);
        setEvent(result.event);
      } catch (err: any) {
        console.error('Failed to load event profile', err);
        setError(err.message || 'Unable to load event details');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [eventId]);

  if (loading) return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-slate-50'}`}><Loader /></div>;

  if (error || !profile) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDark ? 'bg-dark-bg' : 'bg-slate-50'}`}>
        <div className={`${isDark ? 'bg-dark-surface border-dark-border' : 'bg-white border-slate-100'} p-8 rounded-3xl shadow-xl border max-w-md`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-500'}`}>
            <Target className="h-8 w-8" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Event Profile Not Found</h2>
          <p className={`mb-6 ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>{error || "This event hasn't set up their profile yet."}</p>
          <button
            onClick={() => navigate('/student/events')}
            className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${isDark ? 'bg-accent-600 hover:bg-accent-700 shadow-accent-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} text-white`}
          >
            Back to Events
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
        const file = new File([blob], `${event?.title || 'event'}-profile.png`, { type: 'image/png' });
        await navigator.share({
          title: `${event?.title} Profile`,
          text: `Check out the ${event?.title} event on Unify!`,
          files: [file],
        });
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${event?.title || 'event'}-profile.png`;
        link.click();
        URL.revokeObjectURL(url);
        
        await navigator.clipboard.writeText(window.location.href);
        alert('Image downloaded and link copied to clipboard!');
      } else {
        await navigator.share({
          title: event?.title,
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
  const highlights = parseList(profile.highlights);
  const achievements = parseList(profile.achievements);

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
      posterAlt="Event Poster"
      badgeText="Live Event"
      secondaryBadgeText={event?.isPaid ? 'Featured' : undefined}
      title={event?.title || profile?.title || 'Amazing Event'}
      metaContent={(
        <>
          <span className="flex items-center gap-2.5 text-base sm:text-lg"><MapPin className="h-5 w-5 text-blue-500" /> {event?.isOnline ? 'Online Universe' : (event?.location || 'Unify Network')}</span>
          <span className="flex items-center gap-2.5 text-base sm:text-lg"><Users className="h-5 w-5 text-indigo-500" /> by {event?.chapterName || 'Unify Community'}</span>
        </>
      )}
      ctaLabel={`Register Now • ${event?.isPaid ? `₹${event.registrationFee}` : 'Free'}`}
      onCtaClick={() => navigate('/student/events')}
      closeLabel="Close Profile"
      onClose={handleCloseProfile}
      socialLinks={profile.socialLinks}
      getSocialIcon={getSocialIcon}
      isCapturing={isCapturing}
      onShare={handleShare}
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`lg:col-span-3 p-6 sm:p-8 md:p-10 rounded-3xl border shadow-lg shadow-slate-200/10 backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 sm:h-9 w-1.5 rounded-full bg-blue-600" />
          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Event At A Glance</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className={`rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border ${isDark ? 'bg-dark-bg/60 border-dark-border/50' : 'bg-slate-50/70 border-slate-100'}`}>
            <p className={`text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Date</p>
            <p className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {event?.date ? format(new Date(event.date), 'do MMMM, yyyy') : 'To be announced'}
            </p>
          </div>
          <div className={`rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border ${isDark ? 'bg-dark-bg/60 border-dark-border/50' : 'bg-slate-50/70 border-slate-100'}`}>
            <p className={`text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Time</p>
            <p className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{event?.time || 'To be decided'}</p>
          </div>
          <div className={`rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border ${isDark ? 'bg-dark-bg/60 border-dark-border/50' : 'bg-slate-50/70 border-slate-100'}`}>
            <p className={`text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Mode</p>
            <p className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{event?.isOnline ? 'Online' : 'Offline'}</p>
          </div>
          <div className={`rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border ${isDark ? 'bg-dark-bg/60 border-dark-border/50' : 'bg-slate-50/70 border-slate-100'}`}>
            <p className={`text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Entry</p>
            <p className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{event?.isPaid ? 'Paid' : 'Free'}</p>
          </div>
        </div>

        <div className="mt-10 sm:mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 sm:h-9 w-1.5 rounded-full bg-indigo-600" />
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>About The Event</h2>
          </div>
          <div className={`prose prose-lg max-w-none ${isDark ? 'prose-invert' : ''} text-base sm:text-lg`}>
            {profile.about || "More details coming soon. Stay tuned!"}
          </div>
        </div>

        {highlights.length > 0 && (
          <div className="mt-10 sm:mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 sm:h-9 w-1.5 rounded-full bg-amber-600" />
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Event Highlights</h2>
            </div>
            <ul className="space-y-4">
              {highlights.map((highlight: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <Sparkles className={`h-6 w-6 mt-1 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                  <span className={`text-base sm:text-lg ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {achievements.length > 0 && (
          <div className="mt-10 sm:mt-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 sm:h-9 w-1.5 rounded-full bg-emerald-600" />
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Key Achievements</h2>
            </div>
            <ul className="space-y-4">
              {achievements.map((achievement: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <Award className={`h-6 w-6 mt-1 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                  <span className={`text-base sm:text-lg ${isDark ? 'text-dark-text-primary' : 'text-slate-800'}`}>{achievement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </PublicProfileLayout>
  );
};

export default EventPublicProfile;