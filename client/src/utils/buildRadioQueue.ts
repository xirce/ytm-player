import { ITrackBase } from '../../../shared';

export const buildRadioQueue = (selected: ITrackBase, tracks: ITrackBase[]) => {
    const seen = new Set<string>();
    const queue = tracks.filter(track => {
        if (!track.id || seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
    });
    const selectedIndex = queue.findIndex(track => track.id === selected.id);

    return selectedIndex >= 0
        ? { tracks: queue, trackIndex: selectedIndex }
        : { tracks: [selected, ...queue], trackIndex: 0 };
};
