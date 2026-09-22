import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { useTouchPress } from './useTouchPress';

let host;

function Harness() {
    const { pressed, touchHandlers } = useTouchPress();
    return <div data-pressed={pressed} {...touchHandlers} />;
}

function touch(type, x, y) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, 'touches', {
        value: type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX: x, clientY: y }]
    });
    act(() => { host.firstChild.dispatchEvent(event); });
}

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { ReactDOM.render(<Harness />, host); });
});

afterEach(() => {
    act(() => { ReactDOM.unmountComponentAtNode(host); });
    host.remove();
});

test('touch highlight lasts only while holding a row and clears when dragging or cancelling', () => {
    touch('touchstart', 10, 10);
    expect(host.firstChild.dataset.pressed).toBe('true');
    touch('touchmove', 14, 14);
    expect(host.firstChild.dataset.pressed).toBe('true');
    touch('touchend', 14, 14);
    expect(host.firstChild.dataset.pressed).toBe('false');

    touch('touchstart', 10, 10);
    touch('touchmove', 10, 30);
    expect(host.firstChild.dataset.pressed).toBe('false');

    touch('touchstart', 10, 10);
    touch('touchcancel', 10, 10);
    expect(host.firstChild.dataset.pressed).toBe('false');
});
