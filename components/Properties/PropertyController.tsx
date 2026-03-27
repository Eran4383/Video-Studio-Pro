
import React, { useCallback } from 'react';
import { ScrubSlider } from '../UI/ScrubSlider';
import { useInteraction } from '../../hooks/useInteraction';

interface PropertyControllerProps {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onCommit: (value: number) => void;
  metadata?: Record<string, any>;
}

/**
 * PropertyController
 * 
 * A business-logic component that connects a ScrubSlider UI to the InteractionEngine
 * via the useInteraction hook. It manages the lifecycle of a property change:
 * 1. Start: Initializes interaction with ID and initial value.
 * 2. Preview: Updates the InteractionEngine (and GFX) in real-time (60FPS).
 * 3. Commit: Performs the final state update (Zustand/History) when interaction ends.
 */
export const PropertyController: React.FC<PropertyControllerProps> = ({
  id,
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onCommit,
  metadata = {}
}) => {
  const { onInteractionStart, onPreviewUpdate, onInteractionEnd } = useInteraction();

  const handleStart = useCallback(() => {
    // Notify the engine that we are starting to modify this property
    onInteractionStart(id, value, metadata);
  }, [id, value, metadata, onInteractionStart]);

  const handlePreview = useCallback((newValue: number) => {
    // Update the engine in real-time. This dispatches a window event
    // that the GFX layer listens to, bypassing React renders.
    onPreviewUpdate(newValue);
  }, [onPreviewUpdate]);

  const handleEnd = useCallback((finalValue: number) => {
    // End the interaction and perform the final commit to the store.
    // This is where history is pushed and React re-renders the whole tree.
    onInteractionEnd((val) => {
      onCommit(val);
    });
  }, [onInteractionEnd, onCommit]);

  return (
    <ScrubSlider
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      unit={unit}
      onInteractionStart={handleStart}
      onPreview={handlePreview}
      onCommit={handleEnd}
    />
  );
};
