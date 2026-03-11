import { useRef, useCallback } from 'react';
import { Project } from '../types';

export const useHistory = (setProject: (p: Project) => void, initialProject: Project) => {
  const historyRef = useRef<Project[]>([initialProject]);
  const historyIndexRef = useRef<number>(0);

  const pushToHistory = useCallback((newProject: Project) => {
    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    const updatedHistory = [...currentHistory, JSON.parse(JSON.stringify(newProject))];
    if (updatedHistory.length > 50) updatedHistory.shift();
    historyRef.current = updatedHistory;
    historyIndexRef.current = updatedHistory.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      setProject(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, [setProject]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      setProject(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  }, [setProject]);

  return { pushToHistory, undo, redo, historyIndexRef, historyRef };
};
