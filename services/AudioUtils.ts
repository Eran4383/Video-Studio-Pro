import { Asset } from '../types';

export class AudioUtils {
  static async extractAndCompressAudio(file: File): Promise<Blob> {
    console.log('AudioUtils.extractAndCompressAudio started for:', file.name, file.type, file.size);
    // If it's already a small audio file, just return it
    if (file.type.startsWith('audio/') && file.size < 2 * 1024 * 1024) {
      console.log('File is small enough, returning as is');
      return file;
    }

    console.log('Creating AudioContext');
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000, // Downsample to 16kHz to save space
    });

    console.log('Decoding audio data');
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log('Audio decoded, rendering offline');

    // We only need mono for transcription
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, 16000);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();
    console.log('Offline rendering complete, converting to WAV');
    
    return AudioUtils.bufferToWav(renderedBuffer);
  }

  private static bufferToWav(abuffer: AudioBuffer): Blob {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this function)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i));

    while (pos < abuffer.length) {
      for (i = 0; i < numOfChan; i++) {
        // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(44 + offset, sample, true); // write 16-bit sample
        offset += 2;
      }
      pos++;
    }

    return new Blob([buffer], { type: 'audio/wav' });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  }
}
