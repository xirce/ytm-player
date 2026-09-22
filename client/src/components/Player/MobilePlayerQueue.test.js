import React, { createRef } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MobilePlayerQueue } from './MobilePlayerQueue';

jest.mock('../../pages/Queue/QueueContent', () => ({ QueueContent: () => null }));

test('a slow downward swipe closes the queue without needing a final flick', () => {
    const container = document.createElement('div');
    const ref = createRef();
    const onStageChange = jest.fn();
    const originalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class { observe() {} disconnect() {} };
    const height = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(400);

    try {
        act(() => {
            ReactDOM.render(
                <MobilePlayerQueue ref={ref} stage={1} onStageChange={onStageChange} onProgress={() => {}} />,
                container
            );
        });
        act(() => {
            ref.current.begin(100, 0);
            ref.current.move(195, 100);
            ref.current.finish(195, 300);
        });
        expect(onStageChange).toHaveBeenCalledWith(0);
    } finally {
        act(() => { ReactDOM.unmountComponentAtNode(container); });
        height.mockRestore();
        window.ResizeObserver = originalResizeObserver;
    }
});

test('opening updates the queue and artwork progress on intermediate frames', () => {
    const container = document.createElement('div');
    const ref = createRef();
    const onProgress = jest.fn();
    const originalResizeObserver = window.ResizeObserver;
    const originalMatchMedia = window.matchMedia;
    let frame;
    window.ResizeObserver = class { observe() {} disconnect() {} };
    window.matchMedia = jest.fn(() => ({ matches: false }));
    const height = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(400);
    const now = jest.spyOn(performance, 'now').mockReturnValue(0);
    const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    try {
        act(() => { ReactDOM.render(<MobilePlayerQueue ref={ref} stage={0} onStageChange={() => {}} onProgress={onProgress} />, container); });
        expect(container.querySelector('[data-player-queue] > div:last-child').style.visibility).toBe('hidden');
        act(() => { ReactDOM.render(<MobilePlayerQueue ref={ref} stage={1} onStageChange={() => {}} onProgress={onProgress} />, container); });
        act(() => { frame(160); });
        expect(onProgress.mock.lastCall[0]).toBeGreaterThan(0);
        expect(onProgress.mock.lastCall[0]).toBeLessThan(1);
        expect(container.querySelector('[data-player-queue] > div:last-child').style.visibility).toBe('visible');
        expect(container.querySelector('[data-player-queue]').style.transform).toContain('translate3d');
        act(() => { frame(320); });
        expect(onProgress.mock.lastCall[0]).toBe(1);
    } finally {
        act(() => { ReactDOM.unmountComponentAtNode(container); });
        height.mockRestore();
        now.mockRestore();
        raf.mockRestore();
        cancel.mockRestore();
        window.ResizeObserver = originalResizeObserver;
        window.matchMedia = originalMatchMedia;
    }
});

test('an upward swipe from the middle opens the full queue, then a downward swipe returns to the middle', () => {
    const container = document.createElement('div');
    const ref = createRef();
    const onStageChange = jest.fn();
    const originalResizeObserver = window.ResizeObserver;
    const originalMatchMedia = window.matchMedia;
    window.ResizeObserver = class { observe() {} disconnect() {} };
    window.matchMedia = jest.fn(() => ({ matches: true }));
    const height = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);

    try {
        act(() => { ReactDOM.render(<MobilePlayerQueue ref={ref} stage={1} onStageChange={onStageChange} onProgress={() => {}} />, container); });
        act(() => {
            ref.current.begin(300, 0);
            ref.current.move(200, 100);
            ref.current.finish(200, 300);
        });
        expect(onStageChange).toHaveBeenLastCalledWith(2);
        act(() => { ReactDOM.render(<MobilePlayerQueue ref={ref} stage={2} onStageChange={onStageChange} onProgress={() => {}} />, container); });
        expect(container.querySelector('[data-player-queue]').style.getPropertyValue('--queue-content-height')).toBe('552px');
        act(() => {
            ref.current.begin(200, 400);
            ref.current.move(300, 500);
            ref.current.finish(300, 700);
        });
        expect(onStageChange).toHaveBeenLastCalledWith(1);
    } finally {
        act(() => { ReactDOM.unmountComponentAtNode(container); });
        height.mockRestore();
        window.ResizeObserver = originalResizeObserver;
        window.matchMedia = originalMatchMedia;
    }
});
