
/**
 * InteractionEngine (Vanilla TS)
 * 
 * Manages real-time UI interactions (like dragging sliders) outside of React's render cycle.
 * This ensures 60FPS performance by bypassing React state updates during high-frequency events.
 * It dispatches window events that the GFX engine can listen to for immediate visual feedback.
 */

export interface InteractionState {
  id: string;
  value: number;
  initialValue: number;
  isActive: boolean;
  metadata?: any;
}

export type InteractionUpdateEvent = CustomEvent<{
  id: string;
  value: number;
  metadata?: any;
}>;

class InteractionEngine {
  private static instance: InteractionEngine;
  private activeInteraction: InteractionState | null = null;

  private constructor() {}

  public static getInstance(): InteractionEngine {
    if (!InteractionEngine.instance) {
      InteractionEngine.instance = new InteractionEngine();
    }
    return InteractionEngine.instance;
  }

  /**
   * Starts a new interaction session.
   * @param id Unique identifier for the property being interacted with (e.g., 'clip-123-scale')
   * @param initialValue The value before the interaction started
   * @param metadata Optional context (e.g., clipId, property name)
   */
  public startInteraction(id: string, initialValue: number, metadata?: any): void {
    this.activeInteraction = {
      id,
      value: initialValue,
      initialValue,
      isActive: true,
      metadata
    };
  }

  /**
   * Updates the value of the active interaction in real-time.
   * Dispatches a window event for immediate rendering feedback.
   */
  public updateValue(value: number): void {
    if (!this.activeInteraction || !this.activeInteraction.isActive) return;

    this.activeInteraction.value = value;

    // Dispatch custom event for GFX engine or other real-time listeners
    const event = new CustomEvent('gfx:interaction:update', {
      detail: {
        id: this.activeInteraction.id,
        value: this.activeInteraction.value,
        metadata: this.activeInteraction.metadata
      }
    });

    window.dispatchEvent(event);
  }

  /**
   * Ends the current interaction session.
   * Returns the final state so it can be committed to the global store/history.
   */
  public endInteraction(): InteractionState | null {
    if (!this.activeInteraction) return null;

    const finalState = { ...this.activeInteraction };
    this.activeInteraction = null;

    // Notify listeners that interaction has ended
    window.dispatchEvent(new CustomEvent('gfx:interaction:end', {
      detail: { id: finalState.id }
    }));

    return finalState;
  }

  /**
   * Returns the current active interaction state if any.
   */
  public getActiveInteraction(): InteractionState | null {
    return this.activeInteraction;
  }

  /**
   * Checks if a specific ID is currently being interacted with.
   */
  public isInteracting(id: string): boolean {
    return this.activeInteraction?.id === id;
  }
}

export const interactionEngine = InteractionEngine.getInstance();
