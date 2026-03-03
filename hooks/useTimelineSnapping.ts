
import { Project, Asset, Clip } from '../types';
import { MagneticAnchorService } from '../services/MagneticAnchorService';

export const useTimelineSnapping = (project: Project, assets: Asset[], isMagnetEnabled: boolean) => {
  const getSnappedStartTime = (clipId: string, originalStartTime: number, deltaSeconds: number, duration: number): number => {
    let finalStartTime = Math.max(0, originalStartTime + deltaSeconds);
    
    if (!isMagnetEnabled) return finalStartTime;

    // Collect all anchors from all audio tracks
    const allAnchors: number[] = [];
    project.tracks.forEach(t => {
      if (t.type === 'audio') {
        t.clips.forEach(c => {
          const a = assets.find(asset => asset.id === c.assetId);
          if (a && a.anchors) {
            a.anchors.forEach(anchorTime => {
              // Anchor time is relative to asset start, we need it relative to timeline
              const timelineAnchorTime = c.startTime + (anchorTime - c.offset);
              allAnchors.push(timelineAnchorTime);
            });
          }
        });
      }
    });

    // Find nearest anchor to the new start time
    const nearest = MagneticAnchorService.findNearestAnchor(finalStartTime, allAnchors, 0.15);
    if (nearest !== null) {
      return nearest;
    }

    return finalStartTime;
  };

  return { getSnappedStartTime };
};
