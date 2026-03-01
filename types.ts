
export interface TranscriptionResult {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export enum MediaType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
  TEXT = 'TEXT'
}

export interface Asset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number; // in seconds
  thumbnail?: string;
  waveform?: number[]; // Normalized amplitude data (0 to 1)
}

export interface Marker {
  id: string;
  time: number; // For global: timeline time. For clip: relative to asset start (offset + relative_time)
  color?: string;
  label?: string;
}

export interface Clip {
  id: string;
  assetId: string;
  startTime: number; // position on timeline in seconds
  offset: number; // start point within the asset in seconds
  duration: number; // length of the clip on timeline
  layer: number;
  effects: Effect[];
  isSilent?: boolean; // If true, this clip's source audio is disabled
  linkedClipId?: string; // ID of the linked audio or video clip
  content?: string; // Text content for subtitle clips
  markers?: Marker[];
}

export interface Effect {
  id: string;
  type: 'filter' | 'transition' | 'adjustment';
  name: string;
  params: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  resolution: { width: number; height: number };
  fps: number;
  tracks: Track[];
  markers?: Marker[];
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle';
  clips: Clip[];
  isVisible: boolean;
  isMuted: boolean;
  isLocked: boolean;
  height?: number; // Added: dynamic track height for audio inspection
}

export interface ProjectState {
  currentProject: Project;
  assets: Asset[];
  selectedClipId: string | null;
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  zoom: number;
}
