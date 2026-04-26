import React, { ReactNode } from 'react';
import { ArrowLeft, Share2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { encodeS3Url } from '../../utils/s3Utils';

type SocialLinks = Record<string, string | undefined | null>;

interface PublicProfileLayoutProps {
  isDark: boolean;
  profileRef: React.RefObject<HTMLDivElement>;
  posterImageUrl?: string;
  posterAlt: string;
  badgeText: string;
  secondaryBadgeText?: string;
  title: string;
  metaContent: ReactNode;
  ctaLabel: string;
  onCtaClick: () => void;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  socialLinks?: SocialLinks;
  getSocialIcon: (platform: string) => ReactNode;
  isCapturing: boolean;
  onShare: () => void;
}

const PublicProfileLayout: React.FC<PublicProfileLayoutProps> = ({
  isDark,
  profileRef,
  posterImageUrl,
  posterAlt,
  badgeText,
  secondaryBadgeText,
  title,
  metaContent,
  ctaLabel,
  onCtaClick,
  closeLabel,
  onClose,
  children,
  socialLinks,
  getSocialIcon,
  isCapturing,
  onShare,
}) => {
  const heroGroup = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.12,
      },
    },
  };

  const heroItem = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  return (
    <div ref={profileRef} className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-[#fcfdfd]'}`}>
      <div className="relative h-[600px] sm:h-[520px] w-full overflow-hidden bg-slate-200">
        <motion.div
          className={`absolute -top-24 -left-10 h-72 w-72 rounded-full blur-3xl ${isDark ? 'bg-accent-700/20' : 'bg-blue-300/35'}`}
          animate={{ x: [0, 30, -10, 0], y: [0, -16, 8, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute -bottom-28 right-10 h-80 w-80 rounded-full blur-3xl ${isDark ? 'bg-indigo-700/20' : 'bg-indigo-300/35'}`}
          animate={{ x: [0, -24, 12, 0], y: [0, 20, -12, 0], scale: [1, 0.95, 1.06, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />

        {posterImageUrl ? (
          <motion.img
            src={encodeS3Url(posterImageUrl)}
            alt={posterAlt}
            className="w-full h-full object-cover"
            initial={{ scale: 1.08, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        ) : (
          <div className={`w-full h-full ${isDark ? 'bg-dark-surface' : 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20'}`} />
        )}

        <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-dark-bg via-dark-bg/40' : 'from-[#fcfdfd] via-[#fcfdfd]/10'} to-transparent`} />

        <div className="absolute top-6 left-4 right-4 sm:top-8 sm:left-6 sm:right-6 z-20 no-capture flex items-center justify-between">
          <motion.button
            onClick={onClose}
            whileHover={{ x: -4, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className={`px-4 py-2.5 sm:px-5 sm:py-3 backdrop-blur-xl rounded-xl transition-all border flex items-center gap-2 group ${isDark ? 'bg-dark-surface/90 border-dark-border/70 text-white hover:bg-dark-surface' : 'bg-white/60 border-white/40 shadow-md shadow-slate-200/10 text-slate-800 hover:bg-white/80'}`}
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-xs sm:text-sm">{closeLabel}</span>
          </motion.button>

          <motion.button
            onClick={onShare}
            disabled={isCapturing}
            whileHover={{ y: -3, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all border flex items-center gap-2.5 text-white ${isDark ? 'bg-accent-600/95 border-accent-500/60 hover:bg-accent-700 shadow-md shadow-accent-900/20' : 'bg-slate-900/90 border-slate-800/70 hover:bg-slate-900 shadow-md shadow-slate-300/15'} ${isCapturing ? 'opacity-80 cursor-not-allowed' : ''}`}
          >
            {isCapturing ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Share2 className="h-4.5 w-4.5" />}
            <span className="hidden sm:inline">{isCapturing ? 'Generating...' : 'Share Profile'}</span>
          </motion.button>
        </div>

        <div className="absolute bottom-12 sm:bottom-20 left-0 right-0 px-4 sm:px-6 md:px-12">
          <div className="max-w-[1600px] mx-auto">
            <motion.div variants={heroGroup} initial="hidden" animate="visible" className="space-y-4 sm:space-y-6">
              <motion.div variants={heroItem} className="flex items-center gap-3">
                <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm inline-block ${isDark ? 'bg-accent-600/90 text-white' : 'bg-blue-600/90 text-white backdrop-blur-md'}`}>
                  {badgeText}
                </span>
                {secondaryBadgeText && (
                  <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm inline-block ${isDark ? 'bg-amber-500/90 text-white' : 'bg-amber-600/90 text-white backdrop-blur-md'}`}>
                    {secondaryBadgeText}
                  </span>
                )}
              </motion.div>

              <motion.h1 variants={heroItem} className={`text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </motion.h1>

              <motion.div variants={heroItem} className="flex flex-col md:flex-row md:items-center gap-6 sm:gap-8 pt-2 sm:pt-4">
                <div className={`flex flex-wrap gap-x-6 gap-y-3 sm:gap-8 font-bold opacity-90 ${isDark ? 'text-dark-text-secondary' : 'text-slate-500'}`}>{metaContent}</div>

                <motion.button
                  onClick={onCtaClick}
                  whileHover={{ y: -2, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className={`px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl font-black text-xs sm:text-sm shadow-md hover:scale-105 transition-all w-full sm:w-fit no-capture text-white ${isDark ? 'bg-accent-600 hover:bg-accent-700 shadow-accent-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
                >
                  {ctaLabel}
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-16 sm:-mt-12 relative z-10">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-90px' }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          {children}
        </motion.div>

        <div className={`mt-16 sm:mt-24 pt-12 sm:pt-16 border-t flex flex-col md:flex-row justify-between items-center gap-8 no-capture ${isDark ? 'border-dark-border/30' : 'border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className={`flex items-center space-x-2 pr-4 sm:border-r ${isDark ? 'border-dark-border/40' : 'border-slate-200'}`}>
              <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>Socials</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                {socialLinks && Object.entries(socialLinks).length > 0 ? (
                  Object.entries(socialLinks).map(([platform, link], idx) => {
                    if (!link) return null;
                    return (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${isDark ? 'text-dark-text-muted hover:text-accent-400' : 'text-slate-400 hover:text-blue-600'} transition-all hover:scale-110`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px) scale(1.14)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = '';
                        }}
                        title={platform}
                      >
                        {getSocialIcon(platform)}
                      </a>
                    );
                  })
                ) : (
                  <span className={`text-xs font-bold ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>No social links added yet</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className={`text-xs font-black tracking-widest ${isDark ? 'text-dark-text-muted' : 'text-slate-400'}`}>
              2026 UNIFY | BE THE CHANGE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileLayout;
