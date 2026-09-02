import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { PLAYER_TRANSITION_MS, usePlayerSheet } from './usePlayerSheet';

let host, navigation, sheet, element, change, setOpen, frames, now;
let reduced = false;
const originalMatchMedia = window.matchMedia;
const originalResizeObserver = window.ResizeObserver;
const originalAnimate = HTMLElement.prototype.animate;
const originalTimeline = Object.getOwnPropertyDescriptor(document, 'timeline');
const originalPixelRatio = window.devicePixelRatio;

function Harness({ initialOpen }) {
    const [open, update] = useState(initialOpen);
    setOpen = update;
    sheet = usePlayerSheet(true, open, value => { change(value); update(value); });
    return <div ref={sheet.ref}>
        <div data-player-panel>
            <div data-player-layer='mini'>Mini player</div>
            <span data-player-artwork='mini' /><span data-player-artwork='full' />
            <button data-player-layer='full'><svg /></button><div className='MuiSlider-root' />
        </div>
        <img alt='Artwork' data-player-shared-artwork draggable={false} />
    </div>;
}

function mount(open = false) {
    act(() => { ReactDOM.render(<Harness initialOpen={open} />, host); });
    element = host.firstChild;
}

function touch(type, y, time, target = element, options = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    const point = { clientX: options.x ?? 100, clientY: y };
    Object.defineProperties(event, {
        timeStamp: { value: time },
        touches: { value: type === 'touchend' ? [] : options.touches ?? [point] },
        changedTouches: { value: [point] }
    });
    act(() => { target.dispatchEvent(event); });
    return event;
}

function advance(milliseconds = PLAYER_TRANSITION_MS) {
    now += milliseconds;
    act(() => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach(callback => callback(now));
    });
}

const panel = () => element.querySelector('[data-player-panel]');
const progress = () => 1 - Number(panel().style.transform.match(/, ([\d.]+)px/)[1]) / 672;

beforeEach(() => {
    frames = new Map();
    now = 0;
    let nextFrame = 0;
    reduced = false;
    host = document.createElement('div');
    document.body.appendChild(host);
    navigation = document.createElement('header');
    navigation.dataset.playerNavigation = '';
    document.body.appendChild(navigation);
    change = jest.fn();
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
        frames.set(++nextFrame, callback);
        return nextFrame;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
        return this === navigation ? 64 : 800;
    });
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
        const full = this.dataset.playerArtwork === 'full';
        return { left: full ? 40 : 10, top: full ? 60 : 8, width: full ? 300 : 48, height: full ? 300 : 48 };
    });
    window.matchMedia = jest.fn(() => ({ matches: reduced }));
    window.ResizeObserver = class { observe() {} disconnect() {} };
});

afterEach(() => {
    act(() => { ReactDOM.unmountComponentAtNode(host); });
    host.remove();
    navigation.remove();
    jest.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    window.ResizeObserver = originalResizeObserver;
    if (originalAnimate) HTMLElement.prototype.animate = originalAnimate;
    else delete HTMLElement.prototype.animate;
    if (originalTimeline) Object.defineProperty(document, 'timeline', originalTimeline);
    else delete document.timeline;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: originalPixelRatio });
});

test('native mini swipe opens through intermediate frames and suppresses its click', () => {
    mount();
    const mini = element.querySelector('[data-player-layer="mini"]');
    touch('touchstart', 700, 0, mini);
    expect(touch('touchmove', 650, 60, mini).defaultPrevented).toBe(true);
    advance(0);
    expect(progress()).toBeCloseTo(50 / 672);
    expect(navigation.style.transform).toBe(`translate3d(0, ${50 / 672 * 64}px, 0)`);
    touch('touchend', 650, 70, mini);
    expect(change).toHaveBeenCalledWith(true);
    advance(PLAYER_TRANSITION_MS / 2);
    expect(progress()).toBeGreaterThan(0.5);
    expect(progress()).toBeLessThan(1);
    advance(PLAYER_TRANSITION_MS / 2);
    expect(element.dataset.playerState).toBe('open');
    const click = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
    sheet.handlers.onClickCapture(click);
    expect(click.preventDefault).toHaveBeenCalled();
});

test('native artwork drag closes continuously, retaining the panel during animation', () => {
    mount(true);
    const artwork = element.querySelector('img');
    touch('touchstart', 100, 0, artwork);
    touch('touchmove', 300, 200, artwork);
    advance(0);
    expect(progress()).toBeCloseTo(1 - 200 / 672);
    expect(change).not.toHaveBeenCalled();
    touch('touchend', 300, 210, artwork);
    expect(change).toHaveBeenCalledWith(false);
    advance(PLAYER_TRANSITION_MS / 2);
    expect(sheet.visible).toBe(true);
    expect(progress()).toBeGreaterThan(0);
    advance(PLAYER_TRANSITION_MS / 2);
    expect(element.dataset.playerState).toBe('closed');
    expect(sheet.visible).toBe(false);
});

test('tiny flicks, short slow pulls, cancellation and multitouch snap back', () => {
    mount(true);
    touch('touchstart', 100, 0);
    touch('touchmove', 120, 15);
    touch('touchend', 120, 20);
    advance();
    expect(progress()).toBe(1);
    touch('touchstart', 100, 1000);
    touch('touchmove', 150, 1500);
    touch('touchend', 150, 1650);
    advance();
    expect(progress()).toBe(1);
    touch('touchstart', 100, 2000);
    touch('touchmove', 300, 2200);
    touch('touchcancel', 300, 2210);
    advance();
    expect(progress()).toBe(1);
    touch('touchstart', 100, 3000);
    touch('touchmove', 300, 3200);
    touch('touchstart', 300, 3210, element, { touches: [{}, {}] });
    touch('touchend', 300, 3220);
    advance();
    expect(change).not.toHaveBeenCalled();
    expect(progress()).toBe(1);
});

test('buttons, icons, sliders and horizontal gestures retain their touch handling', () => {
    mount(true);
    for (const target of element.querySelectorAll('button, svg, .MuiSlider-root')) {
        touch('touchstart', 100, 0, target);
        expect(touch('touchmove', 250, 100, target).defaultPrevented).toBe(false);
        touch('touchend', 250, 110, target);
    }
    touch('touchstart', 100, 0);
    touch('touchmove', 110, 100, element, { x: 200 });
    touch('touchend', 250, 200);
    expect(change).not.toHaveBeenCalled();
    expect(progress()).toBe(1);
});

test('external requests, resize and reduced motion keep panel and navigation synchronized', () => {
    mount();
    act(() => setOpen(true));
    advance();
    touch('touchstart', 100, 0);
    touch('touchmove', 160, 100);
    act(() => { window.dispatchEvent(new Event('resize')); });
    touch('touchend', 250, 200);
    expect(change).not.toHaveBeenCalled();
    expect(progress()).toBe(1);
    reduced = true;
    act(() => setOpen(false));
    expect(frames.size).toBe(0);
    expect(progress()).toBe(0);
    expect(navigation.style.transform).toBe('translate3d(0, 0px, 0)');
});

test('native completion stays synchronized and can be caught mid-flight without jumping', () => {
    const animations = [];
    Object.defineProperty(document, 'timeline', { configurable: true, value: { currentTime: 123 } });
    HTMLElement.prototype.animate = jest.fn(() => {
        const item = { cancel: jest.fn(), effect: { getComputedTiming: () => ({ progress: 0.5 }) } };
        animations.push(item);
        return item;
    });
    mount();
    act(() => setOpen(true));
    expect(frames.size).toBe(0);
    expect(animations).toHaveLength(5);
    for (const [keyframes, options] of HTMLElement.prototype.animate.mock.calls) {
        expect(Object.keys(keyframes[0])).toHaveLength(1);
        expect(options.duration).toBe(PLAYER_TRANSITION_MS);
    }
    expect(animations.every(item => item.startTime === 123)).toBe(true);
    expect(element.dataset.playerState).toBe('moving');
    touch('touchstart', 100, 0);
    expect(progress()).toBeCloseTo(0.5);
    expect(animations.every(item => item.cancel.mock.calls.length === 1)).toBe(true);
    touch('touchend', 100, 10);
    expect(animations).toHaveLength(10);
    act(() => animations[5].onfinish());
    expect(element.dataset.playerState).toBe('open');
    expect(progress()).toBe(1);
    expect(navigation.style.transform).toBe('translate3d(0, 64px, 0)');
    act(() => setOpen(false));
    act(() => { ReactDOM.unmountComponentAtNode(host); });
    expect(animations.every(item => item.cancel.mock.calls.length === 1)).toBe(true);
    expect(navigation.style.transform).toBe('');
});

test('artwork moves in its own layer with continuous coordinates and no moving ancestor', () => {
    mount(true);
    touch('touchstart', 100, 0);
    touch('touchmove', 233.37, 120);
    advance(16);
    const panelY = Number(panel().style.transform.match(/, ([\d.]+)px/)[1]);
    const artwork = element.querySelector('img');
    const values = artwork.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px, 0\) scale\(([-\d.]+), ([-\d.]+)\)/).slice(1).map(Number);
    const p = 1 - 133.37 / 672;
    expect(panelY).toBeCloseTo(133.37, 8);
    expect(values[1]).toBeCloseTo(panelY + 52 * p, 8);
    expect(values[2] * 300).toBeCloseTo(48 + 252 * p, 8);
    expect(artwork.parentElement).toBe(element);
    expect(element.style.transform).toBe('');
    expect(panel().contains(artwork)).toBe(false);
    expect(element.style.clipPath).toBe('');
});

test('coalesces touch updates per display frame without resizing artwork or reading layout', () => {
    mount(true);
    const artwork = element.querySelector('img');
    touch('touchstart', 100, 0, artwork);
    const layoutReads = HTMLElement.prototype.getBoundingClientRect;
    layoutReads.mockClear();
    touch('touchmove', 140, 10, artwork);
    touch('touchmove', 200, 20, artwork);
    expect(frames.size).toBe(1);
    expect(progress()).toBe(1);
    advance(16);
    expect(progress()).toBeCloseTo(1 - 100 / 672);
    expect(artwork.style.width).toBe('300px');
    expect(artwork.style.height).toBe('300px');
    expect(artwork.style.transform).toContain('scale(');
    expect(layoutReads).not.toHaveBeenCalled();
    touch('touchend', 200, 30, artwork);
    layoutReads.mockClear();
    advance(PLAYER_TRANSITION_MS / 2);
    advance(PLAYER_TRANSITION_MS / 2);
    expect(layoutReads).not.toHaveBeenCalled();
    expect(artwork.style.width).toBe('300px');
    expect(artwork.style.transform).toContain('scale(0.16, 0.16)');
    act(() => { ReactDOM.unmountComponentAtNode(host); });
    expect(navigation.style.transform).toBe('');
});
