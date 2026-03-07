export interface KineticBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KineticWord {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  fontSize: number;
  color: string;
  entranceAnimation: string;
  position: {
    x: number;
    y: number;
  };
}

export interface KineticSettings {
  boundingBox: KineticBoundingBox;
  preset: string;
  fontFamily: string;
  direction: 'ltr' | 'rtl' | 'auto';
  showBox?: boolean;
}

export interface KineticBlock {
  id: string;
  clipId: string;
  settings: KineticSettings;
  words: KineticWord[];
}
