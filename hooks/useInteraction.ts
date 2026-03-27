
import { useCallback } from 'react';
import { interactionEngine } from '../services/InteractionEngine';

/**
 * useInteraction Hook
 * 
 * Bridges the UI components with the InteractionEngine.
 * Provides functions to manage real-time interaction sessions.
 */
export const useInteraction = () => {
  /**
   * Starts a new interaction session.
   * @param id Unique identifier for the property (e.g., 'clip-123-opacity')
   * @param initialValue The value before the interaction started
   * @param metadata Optional context for the GFX engine
   */
  const onInteractionStart = useCallback((id: string, initialValue: number, metadata?: any) => {
    interactionEngine.startInteraction(id, initialValue, metadata);
  }, []);

  /**
   * Updates the value in real-time.
   * This bypasses React's state to ensure 60FPS performance.
   * @param value The new value from the UI (e.g., slider position)
   */
  const onPreviewUpdate = useCallback((value: number) => {
    interactionEngine.updateValue(value);
  }, []);

  /**
   * Ends the interaction session and commits the final value to the store.
   * @param onCommit Callback to update the global store (e.g., Zustand) and history
   */
  const onInteractionEnd = useCallback((onCommit: (value: number) => void) => {
    const finalState = interactionEngine.endInteraction();
    if (finalState) {
      onCommit(finalState.value);
    }
  }, []);

  return {
    onInteractionStart,
    onPreviewUpdate,
    onInteractionEnd,
  };
};
