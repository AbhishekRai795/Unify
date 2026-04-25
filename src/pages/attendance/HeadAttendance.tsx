import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AttendanceManager from '../../components/attendance/AttendanceManager';


const HeadAttendance: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  if (!meetingId) {
    return <div className="p-8 text-center">Meeting ID not found</div>;
  }

  return (
    <AttendanceManager 
      meetingId={meetingId} 
      onClose={() => navigate('/head/attendance/select')} 
    />
  );
};

export default HeadAttendance;
