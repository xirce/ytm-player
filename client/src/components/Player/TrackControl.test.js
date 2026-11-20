import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { TrackControl } from './TrackControl';
import { useAppSelector } from '../../store';
import { useStartPlaybackTrackingMutation, useUpdatePlaybackTrackingMutation } from '../../apiClient';

jest.mock('../../store', () => ({ useAppAction: () => ({}), useAppSelector: jest.fn() }));
jest.mock('../../apiClient', () => ({
    useGetTrackPlaybackQuery: id => typeof id === 'string' ? { currentData: { source: id } } : {},
    useLazyGetRadioQuery: () => [],
    useStartPlaybackTrackingMutation: jest.fn(),
    useUpdatePlaybackTrackingMutation: jest.fn()
}));
jest.mock('./TimeProgressBar', () => ({ TimeProgressBar: () => null }));

const makePlayer = () => {
    const media = document.createElement('video');
    return { getVideoElement: () => media, attachSource: jest.fn(), on: jest.fn(), off: jest.fn() };
};

test('records each playback once without sending watch time when the start returns no session', async () => {
    const container = document.createElement('div');
    const player = makePlayer();
    const standbyPlayer = makePlayer();
    const media = player.getVideoElement();
    const tracks = [{ id: 'track-1', title: 'First' }, { id: 'track-2', title: 'Second' }];
    const resolveStarts = [];
    const start = jest.fn(() => ({ unwrap: () => new Promise(resolve => resolveStarts.push(resolve)) }));
    const update = jest.fn();
    useStartPlaybackTrackingMutation.mockReturnValue([start]);
    useUpdatePlaybackTrackingMutation.mockReturnValue([update]);

    const renderTrack = trackIndex => {
        useAppSelector.mockImplementation(selector => selector({ player: { tracks, trackIndex, isPlaying: false } }));
        act(() => {
            ReactDOM.render(<TrackControl
                player={player} standbyPlayer={standbyPlayer} progressPlayer={player}
                canReadProgressImmediately={trackIndex === 1}
            />, container);
        });
    };
    const dispatchMediaEvent = event => media.dispatchEvent(new Event(event));
    const scheduleTimer = jest.spyOn(window, 'setTimeout');
    try {
        renderTrack(0);
        dispatchMediaEvent('playing');
        media.currentTime = 0.25;
        dispatchMediaEvent('pause');
        dispatchMediaEvent('playing');
        renderTrack(1);
        media.currentTime = 0;
        dispatchMediaEvent('playing');

        scheduleTimer.mockClear();
        await act(async () => {
            resolveStarts.forEach(resolve => resolve({ sessionId: null }));
        });

        media.currentTime = 0.25;
        dispatchMediaEvent('pause');
        dispatchMediaEvent('playing');

        expect(start.mock.calls).toEqual([[{ id: 'track-1', startTime: 0 }], [{ id: 'track-2', startTime: 0 }]]);
        expect(update).not.toHaveBeenCalled();
        expect(scheduleTimer).not.toHaveBeenCalled();
    } finally {
        act(() => { ReactDOM.unmountComponentAtNode(container); });
        scheduleTimer.mockRestore();
    }
});
