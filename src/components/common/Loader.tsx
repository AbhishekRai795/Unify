import React from 'react';
import { Users } from 'lucide-react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        <Users className={`${sizeClasses[size]} text-blue-600 animate-pulse`} />
        <div className="absolute inset-0 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
      </div>
      {text && (
        <p className="mt-4 text-gray-600 text-sm font-medium">{text}</p>
      )}
    </div>
  );
};

export default Loader;