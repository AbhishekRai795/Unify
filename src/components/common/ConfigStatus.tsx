import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';

interface ConfigStatusProps {
  onStatusChange?: (isConnected: boolean) => void;
}

const ConfigStatus: React.FC<ConfigStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<{
    api: boolean;
    config: boolean;
    message: string;
  }>({
    api: false,
    config: false,
    message: 'Checking connection...'
  });

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      // Check if environment variables are loaded
      const configCheck = {
        apiUrl: import.meta.env.VITE_API_BASE_URL,
        userPoolId: import.meta.env.VITE_USER_POOL_ID,
        clientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID,
        region: import.meta.env.VITE_AWS_REGION
      };

      console.log('Frontend Configuration:', configCheck);
      
      const hasConfig = Object.values(configCheck).every(Boolean);
      
      // Try API health check
      let apiConnected = false;
      try {
        await studentAPI.healthCheck();
        apiConnected = true;
      } catch (error) {
        console.error('API health check failed:', error);
      }

      const newStatus = {
        api: apiConnected,
        config: hasConfig,
        message: apiConnected 
          ? 'Connected to backend successfully!' 
          : hasConfig 
            ? 'Configuration loaded, but API connection failed' 
            : 'Missing environment configuration'
      };

      setStatus(newStatus);
      onStatusChange?.(apiConnected && hasConfig);

    } catch (error) {
      console.error('Configuration check error:', error);
      setStatus({
        api: false,
        config: false,
        message: `Configuration check failed: ${error}`
      });
      onStatusChange?.(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all duration-300
        ${status.api && status.config 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
        }
      `}>
        <div className="flex items-center space-x-2">
          <div className={`
            w-3 h-3 rounded-full 
            ${status.api && status.config ? 'bg-green-500' : 'bg-red-500'}
          `} />
          <span>{status.message}</span>
          <button 
            onClick={checkConfiguration}
            className="ml-2 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigStatus;
