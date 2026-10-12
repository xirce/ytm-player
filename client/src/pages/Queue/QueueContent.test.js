import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { QueueContent } from './QueueContent';

const mockTracks = [{ id: 'first' }, { id: 'current' }, { id: 'last' }];
let mockCurrentIndex = 1;

jest.mock('../../store', () => ({
    useAppAction: () => ({ setTracks: jest.fn(), setTrackIndex: jest.fn(), setAutoplay: jest.fn() }),
    useAppSelector: selector => selector({})
}));
jest.mock('../../store/player', () => ({
    getTrackListItems: () => mockTracks.map((track, index) => ({ source: mockTracks, index, isCurrent: index === mockCurrentIndex })),
    getCurrentTrack: () => mockTracks[mockCurrentIndex],
    getAutoplay: () => false,
    getAutoplaySource: () => null
}));
jest.mock('react-draggable-list', () => ({ list }) => <div>
    {list.map(item => <div key={item.index} data-current-track={item.isCurrent || undefined} />)}
</div>);

test('scrolls the current track to the top after a middle-stage request', () => {
    const root = document.createElement('div');
    let frame;
    let delayedScroll;
    const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const timeout = jest.spyOn(window, 'setTimeout').mockImplementation(callback => { delayedScroll = callback; return 1; });
    const clearTimeout = jest.spyOn(window, 'clearTimeout').mockImplementation(() => {});

    try {
        mockCurrentIndex = 1;
        act(() => { ReactDOM.render(<QueueContent embedded autoScrollCurrent scrollToCurrentRequest={1} />, root); });
        const list = root.querySelector('[data-player-queue-list]');
        const current = root.querySelector('[data-current-track="true"]');
        Object.defineProperty(list, 'clientHeight', { value: 200 });
        Object.defineProperty(current, 'offsetHeight', { value: 52 });
        list.scrollTop = 300;
        list.getBoundingClientRect = () => ({ top: 50 });
        current.getBoundingClientRect = () => ({ top: 150 });

        act(() => delayedScroll());
        act(() => frame(0));
        act(() => frame(0));
        act(() => frame(500));

        expect(list.scrollTop).toBe(400);
        expect(list.style.getPropertyValue('--queue-scroll-tail')).toBe('148px');
    } finally {
        act(() => { ReactDOM.unmountComponentAtNode(root); });
        raf.mockRestore();
        cancel.mockRestore();
        timeout.mockRestore();
        clearTimeout.mockRestore();
    }
});
