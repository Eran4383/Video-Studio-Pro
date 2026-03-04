export interface SubtitleItem {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export const parseSRT = (srtContent: string): SubtitleItem[] => {
  const items: SubtitleItem[] = [];
  // Normalize line endings
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  
  let currentItem: Partial<SubtitleItem> = {};
  let state: 'INDEX' | 'TIMECODE' | 'TEXT' = 'INDEX';
  let textBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for timecode line (e.g. "00:00:01,000 --> 00:00:04,000")
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split(' --> ');
      if (startStr && endStr) {
        // If we were building a previous item but didn't finish (no empty line), commit it now
        if (state === 'TEXT' && currentItem.startTime !== undefined && currentItem.endTime !== undefined && textBuffer.length > 0) {
           items.push({
             id: crypto.randomUUID(),
             startTime: currentItem.startTime,
             endTime: currentItem.endTime,
             text: textBuffer.join('\n')
           });
        }
        
        // Start new item
        currentItem = {
          startTime: parseTimecode(startStr),
          endTime: parseTimecode(endStr)
        };
        textBuffer = [];
        state = 'TEXT';
      }
      continue;
    }

    // Empty line usually signals end of block
    if (line === '') {
      if (state === 'TEXT' && currentItem.startTime !== undefined && currentItem.endTime !== undefined && textBuffer.length > 0) {
        items.push({
          id: crypto.randomUUID(),
          startTime: currentItem.startTime,
          endTime: currentItem.endTime,
          text: textBuffer.join('\n')
        });
        currentItem = {};
        textBuffer = [];
        state = 'INDEX';
      }
      continue;
    }

    // If we are in TEXT state, accumulate lines
    if (state === 'TEXT') {
      textBuffer.push(line);
    } 
    // If we are in INDEX state, it's just an index number, ignore it
  }
  
  // Commit last item if exists
  if (state === 'TEXT' && currentItem.startTime !== undefined && currentItem.endTime !== undefined && textBuffer.length > 0) {
      items.push({
          id: crypto.randomUUID(),
          startTime: currentItem.startTime,
          endTime: currentItem.endTime,
          text: textBuffer.join('\n')
      });
  }

  return items;
};

const parseTimecode = (timecode: string): number => {
  // Format: HH:MM:SS,ms
  const [time, ms] = timecode.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  
  return (hours * 3600) + (minutes * 60) + seconds + (Number(ms) / 1000);
};
