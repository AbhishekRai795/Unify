import React from 'react';
import { Award, Shield } from 'lucide-react';

interface CertificateTemplateProps {
  studentName: string;
  eventName: string;
  chapterName: string;
  headName: string;
  date: string;
  certificateType: 'participation' | '1st' | '2nd' | '3rd';
  isDark?: boolean;
}

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  studentName,
  eventName,
  chapterName,
  headName,
  date,
  certificateType,
  isDark = false
}) => {
  const getPositionText = () => {
    switch (certificateType) {
      case '1st': return '1st Position';
      case '2nd': return '2nd Position';
      case '3rd': return '3rd Position';
      default: return 'Participation';
    }
  };

  const getBadgeColor = () => {
    switch (certificateType) {
      case '1st': return 'bg-yellow-500';
      case '2nd': return 'bg-slate-400'; // Silver
      case '3rd': return 'bg-amber-600'; // Bronze
      default: return 'bg-blue-600';
    }
  };

  return (
    <div 
      id="certificate-to-download"
      className={`
        relative overflow-hidden font-serif
        ${isDark ? 'bg-slate-900 border-[16px] border-slate-800' : 'bg-white border-[16px] border-slate-100'}
        shadow-2xl flex flex-col items-center justify-between
      `}
      style={{ 
        width: '960px', 
        height: '540px',
        padding: '24px 48px',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 100%)' 
      }}
    >
      {/* Decorative Ornaments */}
      <div className="absolute top-4 left-4 w-20 h-20 border-t-2 border-l-2 border-blue-600/30"></div>
      <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-blue-600/30"></div>
      <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-blue-600/30"></div>
      <div className="absolute bottom-4 right-4 w-20 h-20 border-b-2 border-r-2 border-blue-600/30"></div>

      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-2">
          <div className={`p-4 rounded-full ${getBadgeColor()} text-white shadow-xl`}>
            <Award size={48} />
          </div>
        </div>
        <h1 className={`text-5xl font-extrabold tracking-widest uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Certificate
        </h1>
        <p className={`text-xl font-medium tracking-wide uppercase ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
          {certificateType === 'participation' ? 'of Participation' : 'of Achievement'}
        </p>
      </div>

      {/* Main Content */}
      <div className="text-center space-y-8 flex-1 flex flex-col justify-center">
        <p className={`text-lg italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          This is to certify that
        </p>
        
        <h2 className={`text-4xl font-bold border-b-2 inline-block px-12 pb-2 whitespace-nowrap ${isDark ? 'text-white border-blue-900' : 'text-slate-900 border-slate-200'}`}>
          {studentName || 'Student Name'}
        </h2>

        <div className={`text-lg px-20 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          has successfully secured <span className="font-bold text-blue-600">{getPositionText()}</span> in the event
          <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            "{eventName || 'Event Name'}"
          </div>
          organized by <span className="font-bold">{chapterName || 'Community Name'}</span>
        </div>
      </div>

      {/* Footer / Signatures - Absolute positioned to prevent clipping */}
      <div className="absolute bottom-10 left-16 text-center w-56">
        <div className={`h-0.5 w-full mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
        <p className={`text-[10px] uppercase tracking-tighter ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Date of Issue</p>
        <p className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{date || new Date().toLocaleDateString('en-GB')}</p>
      </div>

      {/* Center Seal */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 relative flex items-center justify-center">
           <div className="absolute inset-0 bg-blue-600/10 blur-xl rounded-full scale-150"></div>
           <Shield size={44} className="text-blue-600/20" />
      </div>

      <div className="absolute bottom-10 right-16 text-center w-56">
        <div className="h-10 flex items-end justify-center mb-1">
           <span className="font-serif italic text-lg opacity-60 text-slate-700 uppercase tracking-widest">{headName || 'Authorized Signatory'}</span>
        </div>
        <div className={`h-0.5 w-full mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
        <p className={`text-[10px] uppercase tracking-tighter ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Authorized Signature</p>
        <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{headName || 'Authorized Signatory'}</p>
      </div>
    </div>
  );
};

export default CertificateTemplate;
