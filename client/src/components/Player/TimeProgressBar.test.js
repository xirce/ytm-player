import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MediaPlayer } from './ShakaPlayerAdapter';
import { TimeProgressBar } from './TimeProgressBar';

let mockSliderProps;
jest.mock('../Slider/SliderWrapper', () => ({
    SliderWrapper: props => {
        mockSliderProps = props;
        return <div />;
    }
}));
jest.mock('../../utils/playerPersistence', () => ({ loadPlayerProgress: () => null }));

test('playback updates cannot move the slider while a touch seek is held', () => {
    const container = document.createElement('div');
    const listeners = {};
    let playbackTime = 10;
    const player = {
        time: () => playbackTime,
        duration: () => 100,
        seek: jest.fn(),
        on: (event, listener) => { listeners[event] = listener; },
        off: jest.fn()
    };

    try {
        act(() => {
            ReactDOM.render(<TimeProgressBar player={player} canReadImmediately />, container);
        });
        expect(mockSliderProps.value).toBe(0.1);

        act(() => {
            mockSliderProps.onTouchStart();
            playbackTime = 11;
            listeners[MediaPlayer.events.PLAYBACK_TIME_UPDATED]();
        });
        expect(mockSliderProps.value).toBe(0.1);

        act(() => {
            mockSliderProps.onChange(new Event('change'), 0.5);
            playbackTime = 12;
            listeners[MediaPlayer.events.PLAYBACK_TIME_UPDATED]();
        });
        expect(mockSliderProps.value).toBe(0.5);

        act(() => mockSliderProps.onChangeCommitted(new Event('change'), 0.5));
        expect(player.seek).toHaveBeenCalledWith(50);
        act(() => listeners[MediaPlayer.events.PLAYBACK_TIME_UPDATED]());
        expect(mockSliderProps.value).toBe(0.12);
    } finally {
        ReactDOM.unmountComponentAtNode(container);
    }
});
