export interface SubtitleItem {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

const parseTimecode = (timecode: string): number => {
  // Format: HH:MM:SS,ms or HH:MM:SS.ms
  const separator = timecode.includes(',') ? ',' : '.';
  const [time, ms] = timecode.split(separator);
  const parts = time.split(':').map(Number);
  
  let hours = 0, minutes = 0, seconds = 0;
  if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else if (parts.length === 2) {
    [minutes, seconds] = parts;
  } else {
    seconds = parts[0] || 0;
  }
  
  const milliseconds = ms ? Number(ms.padEnd(3, '0').substring(0, 3)) : 0;
  return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
};

export const parseSRT = (srtContent: string): SubtitleItem[] => {
  const items: SubtitleItem[] = [];
  if (!srtContent) return items;

  // Normalize line endings
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into blocks by double newline (or similar)
  const blocks = normalized.trim().split(/\n\s*\n/);
  
  blocks.forEach((block, index) => {
    const lines = block.trim().split('\n');
    if (lines.length < 2) return;

    let timecodeLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('-->')) {
            timecodeLine = i;
            break;
        }
    }

    if (timecodeLine === -1) return;

    const timecode = lines[timecodeLine];
    const [startStr, endStr] = timecode.split(/\s*-->\s*/);
    
    if (startStr && endStr) {
        const text = lines.slice(timecodeLine + 1).join('\n').trim();
        if (text) {
            items.push({
                id: `srt-${Date.now()}-${index}`,
                startTime: parseTimecode(startStr),
                endTime: parseTimecode(endStr),
                text
            });
        }
    }
  });

  return items;
};
