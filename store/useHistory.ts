import { useRef, useCallback } from 'react';
import { Project } from '../types';

export const useHistory = (setProject: (p: Project) => void, initialProject: Project) => {
  const historyRef = useRef<Project[]>([initialProject]);
  const historyIndexRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pushToHistory = useCallback((newProject: Project) => {
    // Clear any pending debounced push
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    const lastState = currentHistory[currentHistory.length - 1];
    
    // Deep comparison to avoid spam if nothing changed
    if (JSON.stringify(lastState) === JSON.stringify(newProject)) {
      return;
    }

    const updatedHistory = [...currentHistory, JSON.parse(JSON.stringify(newProject))];
    if (updatedHistory.length > 200) updatedHistory.shift();
    
    historyRef.current = updatedHistory;
    historyIndexRef.current = updatedHistory.length - 1;
  }, []);

  const pushToHistoryDebounced = useCallback((newProject: Project, delay: number = 300) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      pushToHistory(newProject);
      debounceTimerRef.current = null;
    }, delay);
  }, [pushToHistory]);

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

  return { pushToHistory, pushToHistoryDebounced, undo, redo, historyIndexRef, historyRef };
};
