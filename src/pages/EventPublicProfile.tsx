import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Target,
  Eye,
  Award,
  CheckCircle,
  Share2,
  Instagram,
  Linkedin,
  Twitter,
  Globe,
  Loader2,
  Calendar,
  Clock,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { chapterHeadAPI } from '../services/chapterHeadApi';
import Loader from '../components/common/Loader';
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
      
      if (blob && navigator.share && navigator.canShare({ files: [new File([blob], 'profile.png', { type: 'image/png' })] })) {
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
    <div ref={profileRef} className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-[#fcfdfd]'}`}>
      {/* Immersive Hero Section */}
      <div className="relative h-[520px] w-full overflow-hidden bg-slate-200">
        {profile.posterImageUrl ? (
          <img 
            src={encodeS3Url(profile.posterImageUrl)} 
            alt="Event Poster" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full ${isDark ? 'bg-dark-surface' : 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20'}`} />
        )}
        
        <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-dark-bg via-dark-bg/40' : 'from-[#fcfdfd] via-[#fcfdfd]/10'} to-transparent`} />
        
        <div className="absolute top-8 left-6 z-20 no-capture">
          <button 
            onClick={() => window.close()}
            className={`px-5 py-3 backdrop-blur-xl rounded-2xl transition-all border flex items-center gap-2 group ${isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/15' : 'bg-white/60 border-white/40 shadow-xl shadow-slate-200/20 text-slate-800 hover:bg-white/80'}`}
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Close Profile</span>
          </button>
        </div>

        <div className="absolute bottom-20 left-0 right-0 px-6 md:px-12">
          <div className="max-w-[1600px] mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm inline-block ${isDark ? 'bg-accent-600/90 text-white' : 'bg-blue-600/90 text-white backdrop-blur-md'}`}>
                  Live Event
                </span>
                {event?.isPaid && (
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm inline-block ${isDark ? 'bg-amber-500/90 text-white' : 'bg-amber-600/90 text-white backdrop-blur-md'}`}>
                    Featured
                  </span>
                )}
              </div>
              <h1 className={`text-6xl md:text-9xl font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {event?.title || profile?.title || 'Amazing Event'}
              </h1>
              
              <div className="flex flex-col md:flex-row md:items-center gap-8 pt-4">
                <div className={`flex flex-wrap gap-8 font-bold opacity-90 ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                  <span className="flex items-center gap-2.5 text-lg"><MapPin className="h-5 w-5 text-blue-500" /> {event?.isOnline ? 'Online Universe' : (event?.location || 'Unify Network')}</span>
                  <span className="flex items-center gap-2.5 text-lg"><Users className="h-5 w-5 text-indigo-500" /> by {event?.chapterName}</span>
                </div>
                
                <button 
                  onClick={() => navigate('/student/events')}
                  className="px-10 py-4 bg-blue-600 text-white rounded-full font-black text-sm shadow-2xl shadow-blue-500/40 hover:bg-blue-700 hover:scale-105 transition-all w-fit no-capture"
                >
                  Register Now • {event?.isPaid ? `₹${event.registrationFee}` : 'Free'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-12 -mt-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* Action Row - Info Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`lg:col-span-3 p-8 rounded-[3.5rem] shadow-2xl shadow-slate-200/20 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                  <Calendar className="h-8 w-8" />
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Date</p>
                  <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {event?.startDateTime ? format(new Date(event.startDateTime), 'MMMM do, yyyy') : 'TBD'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="p-5 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                  <Clock className="h-8 w-8" />
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Time</p>
                  <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {event?.startDateTime ? format(new Date(event.startDateTime), 'p') : 'TBD'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="p-5 bg-purple-600 rounded-3xl text-white shadow-xl shadow-purple-500/20">
                  <MapPin className="h-8 w-8" />
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Location</p>
                  <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {event?.isOnline ? 'Digital Twin' : (event?.location || 'Physical Hub')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`lg:col-span-2 p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/20 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
          >
            <h2 className={`text-4xl font-black mb-8 flex items-center gap-5 ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>
              <div className="h-10 w-2 bg-blue-600 rounded-full" />
              Event Narrative
            </h2>
            <p className={`text-xl leading-relaxed whitespace-pre-line font-medium opacity-90 ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
              {profile.about || "This event is designed to bring together brilliant minds for a session of learning, networking, and growth."}
            </p>
            {profile.eventDetails && (
              <div className={`mt-8 pt-8 border-t ${isDark ? 'border-dark-border/30' : 'border-slate-100'}`}>
                 <p className={`text-lg leading-relaxed ${isDark ? 'text-dark-text-secondary' : 'text-slate-600'}`}>
                  {profile.eventDetails}
                </p>
              </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`p-10 rounded-[3.5rem] shadow-2xl shadow-slate-200/20 border backdrop-blur-xl space-y-10 transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
          >
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3.5 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                  <Target className="h-6 w-6" />
                </div>
                <h4 className={`text-2xl font-black ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Purpose</h4>
              </div>
              <p className={`text-base leading-relaxed font-semibold ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                {profile.mission || "Driving innovation through collaborative experiences."}
              </p>
            </div>
            <div className="pt-10 border-t border-slate-100/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3.5 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                  <Eye className="h-6 w-6" />
                </div>
                <h4 className={`text-2xl font-black ${isDark ? 'text-dark-text-primary' : 'text-slate-900'}`}>Expectations</h4>
              </div>
              <p className={`text-base leading-relaxed font-semibold ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
                {profile.vision || "Gain insights, build connections, and walk away with actionable knowledge."}
              </p>
            </div>
          </motion.div>

          {profile.galleryImageUrls && profile.galleryImageUrls.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`lg:col-span-3 p-8 rounded-[3.5rem] shadow-2xl shadow-slate-200/20 border backdrop-blur-xl transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {profile.galleryImageUrls.map((url: string, idx: number) => (
                  <div key={idx} className="aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-slate-100/50 border border-white/40">
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
            className={`p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/20 border backdrop-blur-xl h-full transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
          >
            <h3 className={`font-black text-xs uppercase tracking-[0.3em] mb-10 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Highlights</h3>
            <div className="space-y-5">
              {parseList(profile.highlights).length > 0 ? (
                parseList(profile.highlights).map((item: string, idx: number) => (
                  <div key={idx} className={`flex items-start gap-4 p-6 rounded-[2rem] border font-bold text-sm transition-all hover:bg-slate-50/50 ${isDark ? 'bg-dark-bg/50 border-dark-border/50 text-dark-text-secondary' : 'bg-slate-50/30 border-slate-100/50 text-slate-700 shadow-sm'}`}>
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
            className={`p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/20 border backdrop-blur-xl h-full transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
          >
            <h3 className={`font-black text-xs uppercase tracking-[0.3em] mb-10 ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Takeaways</h3>
            <div className="space-y-5">
              {parseList(profile.achievements).length > 0 ? (
                parseList(profile.achievements).map((item: string, idx: number) => (
                  <div key={idx} className={`flex items-start gap-5 p-6 border-l-8 border-amber-500/80 rounded-r-[2.5rem] rounded-l-md font-bold text-sm transition-all hover:bg-amber-50/50 ${isDark ? 'bg-amber-500/5 text-dark-text-secondary border-amber-500/20' : 'bg-amber-50/40 shadow-sm text-amber-950 border-amber-100/50'}`}>
                    <Award className="h-6 w-6 text-amber-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 font-bold text-slate-300 italic">Future milestones</div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`p-10 rounded-[3.5rem] shadow-2xl shadow-slate-200/20 border backdrop-blur-xl flex flex-col items-center justify-center text-center transition-colors duration-300 ${isDark ? 'bg-dark-surface/80 border-dark-border/50' : 'bg-white/80 border-white/60'}`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-xl ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-black'}`}>
              {isCapturing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Share2 className="h-8 w-8" />}
            </div>
            <h3 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isCapturing ? 'Generating...' : 'Invite Others'}
            </h3>
            <p className={`text-sm font-bold opacity-70 mb-8 ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>
              {isCapturing ? 'Generating your event promo image...' : `Spread the word about ${event?.title || 'this event'} and build the hub.`}
            </p>
            <button 
              onClick={handleShare}
              disabled={isCapturing}
              className={`flex items-center gap-3 px-10 py-5 rounded-full font-black text-sm transition-all text-white hover:scale-105 active:scale-95 shadow-xl no-capture ${isDark ? 'bg-white/10 hover:bg-white/20 shadow-white/5' : 'bg-black hover:bg-slate-800 shadow-black/20'} ${isCapturing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCapturing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
              {isCapturing ? 'Capturing Image...' : 'Share Profile'}
            </button>
          </motion.div>
        </div>

        {/* Global Footer Section */}
        <div className={`mt-24 pt-16 border-t flex flex-col md:flex-row justify-between items-center gap-8 no-capture ${isDark ? 'border-dark-border/30' : 'border-slate-200'}`}>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-4">
            <div className="flex items-center space-x-2 pr-4 md:border-r border-slate-200">
              <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Socials</span>
            </div>
            
            <div className="flex items-center space-x-4">
               <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Connect With Us</span>
               <div className="flex items-center space-x-4">
                {profile.socialLinks && Object.entries(profile.socialLinks).map(([platform, link]: [string, any], idx) => {
                  if (!link) return null;
                  return (
                    <a key={idx} href={link} target="_blank" rel="noopener noreferrer" 
                       className={`text-slate-400 hover:text-blue-600 transition-all hover:scale-110`}
                       title={platform}>
                      {getSocialIcon(platform)}
                    </a>
                  );
                })}
               </div>
            </div>
          </div>

          <div className="text-right">
            <p className={`text-xs font-black tracking-widest ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>
                2026 UNIFY | BE THE CHANGE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPublicProfile;