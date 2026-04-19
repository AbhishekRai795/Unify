import React, { useEffect, useMemo } from 'react';
import MessagingSection from '../components/chat/MessagingSection';
import { useData } from '../contexts/DataContext';

const StudentMessaging: React.FC = () => {
  const { myChapters, fetchMyChapters } = useData();

  useEffect(() => {
    fetchMyChapters();
  }, []);

  const chapterIds = useMemo(
    () => Array.from(
      new Set(
        (myChapters || [])
          .map((chapter: any) => chapter?.chapterId || chapter?.id)
          .filter(Boolean)
      )
    ) as string[],
    [myChapters]
  );

  return (
    <MessagingSection
      title="Messaging"
      subtitle="Stay connected with your chapter heads in real time."
      chapterIds={chapterIds}
      backPath="/student/dashboard"
    />
  );
};

export default StudentMessaging;
