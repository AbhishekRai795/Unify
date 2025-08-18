import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hover = true 
}) => {
  const { isDark } = useTheme();

  return (
    <div className={`
      ${isDark 
        ? 'bg-dark-surface/80 backdrop-blur-md border-dark-border/50 shadow-2xl' 
        : 'bg-white/90 backdrop-blur-md border-gray-200/50 shadow-lg'
      }
      border rounded-lg transition-all duration-300
      ${hover ? 'hover:scale-[1.02] hover:shadow-xl' : ''}
      ${isDark && hover ? 'hover:shadow-accent-500/20 glow-effect' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

export default GlassCard;
