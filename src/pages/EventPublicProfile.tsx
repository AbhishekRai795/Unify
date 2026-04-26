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
  Calendar,
  Clock,
  Users,
  Sparkles,
  CircleDollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { chapterHeadAPI } from '../services/chapterHeadApi';
import Loader from '../components/common/Loader';
import PublicProfileLayout from '../components/profiles/PublicProfileLayout';
import { useTheme } from '../contexts/ThemeContext';
import { encodeS3Url } from '../utils/s3Utils';
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
          <span className="flex items-center gap-2.5 text-lg"><MapPin className="h-5 w-5 text-blue-500" /> {event?.isOnline ? 'Online Universe' : (event?.location || 'Unify Network')}</span>
          <span className="flex items-center gap-2.5 text-lg"><Users className="h-5 w-5 text-indigo-500" /> by {event?.chapterName || 'Unify Community'}</span>
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
        className={`lg:col-span-3 p-8 md:p-10 rounded-3xl border shadow-lg shadow-slate-200/10 backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-1.5 rounded-full bg-blue-600" />
          <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Event At A Glance</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className={`rounded-[2rem] p-5 border ${isDark ? 'bg-dark-bg/60 border-dark-border/50' : 'bg-slate-50/70 border-slate-100'}`}>
            <p className={`text-[10px] uppercase tracking-[0.2em] font-black mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Date</p>
            <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {event?.startDateTime ? format(new Date(event.startDateTime), 'MMM do, yyyy') : 'To be announced'}
            </p>
            <Calendar className="h-5 w-5 mt-3 text-blue-500" />
          </div>

          <div className={`rounded-[2rem] p-5 border ${isDark ? 'bg-dark-bg/60 border-dark-border/50' : 'bg-slate-50/70 border-slate-100'}`}>
            <p className={`text-[10px] uppercase tracking-[0.2em] font-black mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Time</p>
            <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {event?.startDateTime ? format(new Date(event.startDateTime), 'p') : 'To be announced'}
            </p>
            <Clock className="h-5 w-5 mt-3 text-indigo-500" />
          </div>

          <div className={`rounded-[2rem] p-5 border ${isDark ? 'bg-dark-bg/60 border-dark-border/50' : 'bg-slate-50/70 border-slate-100'}`}>
            <p className={`text-[10px] uppercase tracking-[0.2em] font-black mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Location</p>
            <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {event?.isOnline ? 'Online Event' : (event?.location || 'Physical Venue')}
            </p>
            <MapPin className="h-5 w-5 mt-3 text-fuchsia-500" />
          </div>

          <div className={`rounded-[2rem] p-5 border ${isDark ? 'bg-dark-bg/60 border-dark-border/50' : 'bg-slate-50/70 border-slate-100'}`}>
            <p className={`text-[10px] uppercase tracking-[0.2em] font-black mb-2 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Entry</p>
            <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {event?.isPaid ? `Paid • INR ${event?.registrationFee ?? 0}` : 'Free Access'}
            </p>
            <CircleDollarSign className="h-5 w-5 mt-3 text-emerald-500" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`lg:col-span-2 p-10 md:p-12 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
      >
        <h2 className={`text-3xl md:text-4xl font-black mb-7 flex items-center gap-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <div className="h-10 w-2 bg-blue-600 rounded-full" />
          Event Narrative
        </h2>
        <p className={`text-lg md:text-xl leading-relaxed whitespace-pre-line font-medium ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
          {profile.about || 'This event is designed to bring together brilliant minds for a session of learning, networking, and growth.'}
        </p>

        {profile.eventDetails && (
          <div className={`mt-8 pt-7 border-t ${isDark ? 'border-dark-border/40' : 'border-slate-100'}`}>
            <p className={`text-base md:text-lg leading-relaxed ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
              {profile.eventDetails}
            </p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={`p-8 md:p-10 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
      >
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-600 rounded-2xl text-white">
                <Target className="h-5 w-5" />
              </div>
              <h4 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Purpose</h4>
            </div>
            <p className={`text-sm leading-relaxed font-semibold ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
              {profile.mission || 'Driving innovation through collaborative experiences.'}
            </p>
          </div>

          <div className={`pt-7 border-t ${isDark ? 'border-dark-border/40' : 'border-slate-100/80'}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                <Eye className="h-5 w-5" />
              </div>
              <h4 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>What You Will Gain</h4>
            </div>
            <p className={`text-sm leading-relaxed font-semibold ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
              {profile.vision || 'Gain insights, build connections, and walk away with actionable knowledge.'}
            </p>
          </div>

          {highlights.length > 0 && (
            <div className={`pt-7 border-t ${isDark ? 'border-dark-border/40' : 'border-slate-100/80'}`}>
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h5 className={`text-sm font-black uppercase tracking-[0.18em] ${isDark ? 'text-dark-text-muted' : 'text-slate-500'}`}>Top Highlights</h5>
              </div>
              <div className="space-y-3">
                {highlights.slice(0, 3).map((item: string, idx: number) => (
                  <div key={idx} className={`rounded-2xl px-4 py-3 text-sm font-semibold border ${isDark ? 'bg-dark-bg/60 border-dark-border/50 text-dark-text-secondary' : 'bg-slate-50/80 border-slate-100 text-slate-700'}`}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

          {profile.galleryImageUrls && profile.galleryImageUrls.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`lg:col-span-3 p-8 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-1.5 rounded-full bg-fuchsia-500" />
                <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Event Moments</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {profile.galleryImageUrls.map((url: string, idx: number) => (
                  <div key={idx} className={`rounded-[2.2rem] overflow-hidden bg-slate-100/50 border ${idx % 7 === 0 ? 'md:col-span-2 md:aspect-[8/3]' : 'aspect-[4/3]'} ${isDark ? 'border-dark-border/60' : 'border-white/40'}`}>
                    <img src={encodeS3Url(url)} alt={`Gallery ${idx}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`lg:col-span-2 p-10 md:p-12 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl h-full transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
          >
            <h3 className={`font-black text-xs uppercase tracking-[0.3em] mb-10 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Highlights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlights.length > 0 ? (
                highlights.map((item: string, idx: number) => (
                  <div key={idx} className={`flex items-start gap-4 p-6 rounded-[2rem] border font-bold text-sm transition-all ${isDark ? 'bg-dark-bg/50 border-dark-border/50 text-dark-text-secondary hover:bg-dark-bg/70' : 'bg-slate-50/30 border-slate-100/50 text-slate-700 shadow-sm hover:bg-slate-50/50'}`}>
                    <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className={`col-span-full text-center py-10 font-bold italic ${isDark ? 'text-dark-text-muted' : 'text-slate-300'}`}>No markers yet</div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`p-10 md:p-12 rounded-3xl shadow-lg shadow-slate-200/10 border backdrop-blur-xl h-full transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
          >
            <h3 className={`font-black text-xs uppercase tracking-[0.3em] mb-10 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Takeaways</h3>
            <div className="space-y-5">
              {achievements.length > 0 ? (
                achievements.map((item: string, idx: number) => (
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
  );
};

export default EventPublicProfile;