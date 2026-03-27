
import { KineticBlock } from './types/kinetic';

export enum MediaType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
  TEXT = 'TEXT'
}

export const WAVEFORM_SAMPLES_PER_SECOND = 30;

export interface Asset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number; // in seconds
  thumbnail?: string;
  width?: number;
  height?: number;
  waveform?: number[]; // Normalized amplitude data (0 to 1)
  anchors?: number[]; // Timestamps (in seconds) where audio onsets are detected
  audioBuffer?: AudioBuffer; // Decoded audio data for sample-accurate playback
  file?: File; // Original file reference for re-processing
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
  position?: { x: number; y: number }; // Relative position (0-1) for text/subtitles
  color?: string; // Text color for subtitle clips
  font?: string; // Font family for subtitle clips
  scale?: number; // Scale factor for subtitle clips (Uniform)
  scaleX?: number; // Scale factor X
  scaleY?: number; // Scale factor Y
  rotation?: number; // Rotation in degrees
  
  // New Effects & Styles
  opacity?: number;
  shadow?: boolean;
  fontWeight?: string; // 'bold', 'normal', etc.
  isItalic?: boolean;
  isUnderline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  
  // Kinetic Typography Data (Optional)
  kineticData?: KineticBlock;
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
  backgroundColor?: string;
  kineticBlocks?: KineticBlock[];
  waveformStyle?: 'solid' | 'lines';
  waveformScale?: number;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle' | 'image';
  clips: Clip[];
  isVisible: boolean;
  isMuted: boolean;
  isLocked: boolean;
  height?: number; // Added: dynamic track height for audio inspection
}

export interface ProjectState {
  currentProject: Project;
  assets: Asset[];
  selectedClipIds: string[];
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  zoom: number;
}
