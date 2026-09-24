import { expect, test } from '@jest/globals';
import { ITrackBase } from '../../../shared';
import { buildRadioQueue } from './buildRadioQueue';

const track = (id: string): ITrackBase => ({
    id,
    title: id,
    artist: { id: null, name: '' },
    imageUrl: '',
    duration: null,
    radioId: `RDAMVM${id}`
});

test('keeps YouTube order and selects the requested track', () => {
    const result = buildRadioQueue(track('selected'), [track('before'), track('selected'), track('after')]);

    expect(result.tracks.map(item => item.id)).toEqual(['before', 'selected', 'after']);
    expect(result.trackIndex).toBe(1);
});

test('prepends a missing requested track and removes duplicates', () => {
    const result = buildRadioQueue(track('selected'), [track('related'), track('related')]);

    expect(result.tracks.map(item => item.id)).toEqual(['selected', 'related']);
    expect(result.trackIndex).toBe(0);
});
