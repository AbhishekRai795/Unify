import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  X,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { attendanceAPI } from '../../services/attendanceApi';

interface QRScannerProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onClose, onSuccess }) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    checkPermission();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error('Failed to clear scanner', err));
      }
    };
  }, []);

  const checkPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setStatus('scanning');
      setTimeout(startScanner, 100);
    } catch (err) {
      console.error('Camera permission denied:', err);
      setHasPermission(false);
      setStatus('error');
      setErrorMessage('Camera permission is required to scan QR codes. Please enable it in your browser settings.');
    }
  };

  const startScanner = () => {
    if (scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
      },
      /* verbose= */ false
    );

    const onScanSuccess = async (decodedText: string) => {
      scanner.pause(true);
      setStatus('verifying');
      
      try {
        let location = undefined;
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
          console.warn('Geolocation failed or denied:', e);
        }

        const deviceId = btoa(navigator.userAgent + screen.width + screen.height).slice(0, 32);
        await attendanceAPI.markAttendance(decodedText, location, deviceId);
        setStatus('success');
        if (onSuccess) onSuccess();
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.response?.data?.message || 'Failed to verify attendance');
        scanner.resume();
      }
    };

    scanner.render(onScanSuccess, (err) => {});
    scannerRef.current = scanner;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 min-h-[400px]">
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-800 dark:text-dark-text-primary">
          {status === 'success' ? 'Great Job!' : 'Scan Attendance QR'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-dark-text-muted mt-1">
          {status === 'success' ? 'Your attendance has been recorded.' : 'Point your camera at the screen'}
        </p>
      </div>

      <div className="relative w-full max-w-[350px] aspect-square bg-slate-100 dark:bg-dark-bg/50 rounded-3xl overflow-hidden border-4 border-slate-200 dark:border-dark-border shadow-inner">
        <div id="qr-reader" className="w-full h-full" />
        
        {hasPermission === false && (
          <div className="absolute inset-0 bg-white dark:bg-dark-surface flex flex-col items-center justify-center p-8 text-center">
            <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
            <h4 className="font-bold text-slate-800 dark:text-dark-text-primary">Permission Denied</h4>
            <p className="text-sm text-slate-500 dark:text-dark-text-muted mt-2">{errorMessage}</p>
            <button 
              onClick={checkPermission}
              className="mt-6 flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Settings className="h-5 w-5" />
              <span>Grant Access</span>
            </button>
          </div>
        )}

        {status === 'verifying' && (
          <div className="absolute inset-0 bg-white/90 dark:bg-dark-bg/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mb-4" />
            <p className="font-bold text-slate-800 dark:text-dark-text-primary text-lg">Verifying...</p>
            <p className="text-sm text-slate-500 mt-1">Don't close this page</p>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 bg-green-500 flex flex-col items-center justify-center z-20 animate-in fade-in zoom-in duration-300">
            <div className="bg-white/20 p-6 rounded-full mb-4">
              <CheckCircle2 className="h-20 w-20 text-white animate-bounce" />
            </div>
            <p className="font-bold text-white text-2xl">Success!</p>
            <button 
              onClick={onClose}
              className="mt-8 bg-white text-green-600 px-10 py-3 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl"
            >
              Back to Home
            </button>
          </div>
        )}

        {status === 'error' && hasPermission !== false && (
          <div className="absolute inset-0 bg-red-500 flex flex-col items-center justify-center p-6 text-center z-20">
            <XCircle className="h-16 w-16 text-white mb-4" />
            <p className="font-bold text-white text-lg">Verification Failed</p>
            <p className="text-white/90 text-sm mt-2">{errorMessage}</p>
            <button 
              onClick={() => {
                setStatus('scanning');
                if (scannerRef.current) scannerRef.current.resume();
              }}
              className="mt-8 bg-white text-red-600 px-8 py-2 rounded-2xl font-bold hover:bg-opacity-90 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {status !== 'success' && (
        <button 
          onClick={onClose}
          className="flex items-center space-x-2 text-slate-500 dark:text-dark-text-muted hover:text-red-500 transition-colors py-2"
        >
          <X className="h-5 w-5" />
          <span className="font-bold text-sm">Cancel Scan</span>
        </button>
      )}
    </div>
  );
};

export default QRScanner;
