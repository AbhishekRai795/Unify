import React, { useEffect, useMemo } from 'react';
import MessagingSection from '../components/chat/MessagingSection';
import { useChapterHead } from '../contexts/ChapterHeadContext';

const HeadMessaging: React.FC = () => {
  const { chapters, refreshData } = useChapterHead();

  useEffect(() => {
    refreshData();
  }, []);

  const chapterIds = useMemo(
    () => Array.from(new Set((chapters || []).map((chapter) => chapter.chapterId).filter(Boolean))),
    [chapters]
  );

  return (
    <MessagingSection
      title="Messaging"
      subtitle="Manage student conversations in one dedicated workspace."
      chapterIds={chapterIds}
      backPath="/head/dashboard"
    />
  );
};

export default HeadMessaging;
