import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-xl transition-all duration-300 group
        ${isDark 
          ? 'bg-dark-surface/50 backdrop-blur-md border border-dark-border hover:bg-glass-purple hover:border-accent-500/50' 
          : 'bg-white/80 backdrop-blur-md border border-gray-200 hover:bg-blue-50 hover:border-blue-300'
        }
        hover:scale-105 hover:shadow-lg
        ${isDark ? 'hover:shadow-accent-500/20' : 'hover:shadow-blue-500/20'}
      `}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={`
            absolute inset-0 w-5 h-5 transition-all duration-500 transform
            ${isDark 
              ? 'opacity-0 rotate-90 scale-50 text-gray-400' 
              : 'opacity-100 rotate-0 scale-100 text-yellow-500 group-hover:text-yellow-600'
            }
          `}
        />
        <Moon
          className={`
            absolute inset-0 w-5 h-5 transition-all duration-500 transform
            ${isDark 
              ? 'opacity-100 rotate-0 scale-100 text-accent-400 group-hover:text-accent-300' 
              : 'opacity-0 -rotate-90 scale-50 text-gray-400'
            }
          `}
        />
      </div>
      
      {/* Glow effect for dark mode */}
      {isDark && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent-500/20 to-primary-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm -z-10" />
      )}
    </button>
  );
};

export default ThemeToggle;
