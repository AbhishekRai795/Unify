import React from 'react';
import { Users, Mail, Phone, MapPin } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Footer: React.FC = () => {
  const { isDark } = useTheme();
  
  return (
    <footer className={`
      transition-all duration-300
      ${isDark 
        ? 'bg-dark-bg border-t border-dark-border/30' 
        : 'bg-gray-900'
      } text-white
    `}>
      <div className="w-full px-6 sm:px-8 lg:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Users className={`h-8 w-8 ${isDark ? 'text-accent-400' : 'text-blue-400'}`} />
              <span className={`text-2xl font-bold ${isDark ? 'text-dark-text-primary' : 'text-white'}`}>Unify</span>
            </div>
            <p className={`${isDark ? 'text-dark-text-secondary' : 'text-gray-400'}`}>
              Connecting students with chapters and opportunities for growth and collaboration.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text-primary' : 'text-white'}`}>Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className={`transition-colors ${isDark ? 'text-dark-text-secondary hover:text-accent-400' : 'text-gray-400 hover:text-white'}`}>About Us</a></li>
              <li><a href="#" className={`transition-colors ${isDark ? 'text-dark-text-secondary hover:text-accent-400' : 'text-gray-400 hover:text-white'}`}>Chapters</a></li>
              <li><a href="#" className={`transition-colors ${isDark ? 'text-dark-text-secondary hover:text-accent-400' : 'text-gray-400 hover:text-white'}`}>Events</a></li>
              <li><a href="#" className={`transition-colors ${isDark ? 'text-dark-text-secondary hover:text-accent-400' : 'text-gray-400 hover:text-white'}`}>Support</a></li>
            </ul>
          </div>

          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text-primary' : 'text-white'}`}>For Students</h3>
            <ul className="space-y-2">
              <li><a href="#" className={`transition-colors ${isDark ? 'text-dark-text-secondary hover:text-accent-400' : 'text-gray-400 hover:text-white'}`}>Student Portal</a></li>
              <li><a href="#" className={`transition-colors ${isDark ? 'text-dark-text-secondary hover:text-accent-400' : 'text-gray-400 hover:text-white'}`}>Register</a></li>
              <li><a href="#" className={`transition-colors ${isDark ? 'text-dark-text-secondary hover:text-accent-400' : 'text-gray-400 hover:text-white'}`}>Find Chapters</a></li>
              <li><a href="#" className={`transition-colors ${isDark ? 'text-dark-text-secondary hover:text-accent-400' : 'text-gray-400 hover:text-white'}`}>Upcoming Events</a></li>
            </ul>
          </div>

          <div className="md:justify-self-end md:text-right">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-dark-text-primary' : 'text-white'}`}>Contact Info</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 md:justify-end">
                <Mail className={`h-4 w-4 ${isDark ? 'text-accent-400' : 'text-blue-400'}`} />
                <span className={`${isDark ? 'text-dark-text-secondary' : 'text-gray-400'}`}>contact@unify.edu</span>
              </div>
              <div className="flex items-center space-x-2 md:justify-end">
                <Phone className={`h-4 w-4 ${isDark ? 'text-accent-400' : 'text-blue-400'}`} />
                <span className={`${isDark ? 'text-dark-text-secondary' : 'text-gray-400'}`}>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2 md:justify-end">
                <MapPin className={`h-4 w-4 ${isDark ? 'text-accent-400' : 'text-blue-400'}`} />
                <span className={`${isDark ? 'text-dark-text-secondary' : 'text-gray-400'}`}>University Campus</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`border-t mt-8 pt-8 text-center ${isDark ? 'border-dark-border/50' : 'border-gray-800'}`}>
          <p className={`${isDark ? 'text-dark-text-secondary' : 'text-gray-400'}`}>
            © 2026 Unify. Built with ❤️ for students.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
