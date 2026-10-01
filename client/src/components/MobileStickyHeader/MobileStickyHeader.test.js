import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { MobileStickyHeader } from './MobileStickyHeader';

let host;
let intersect;
const originalObserver = global.IntersectionObserver;

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    global.IntersectionObserver = jest.fn(callback => {
        intersect = callback;
        return { observe: jest.fn(), disconnect: jest.fn() };
    });

    act(() => {
        ReactDOM.render(
            <MemoryRouter>
                <MobileStickyHeader title="Длинное название альбома" headerClassName="fullHeader">
                    <div data-testid="full-header">Полная шапка</div>
                </MobileStickyHeader>
            </MemoryRouter>,
            host
        );
    });
});

afterEach(() => {
    act(() => { ReactDOM.unmountComponentAtNode(host); });
    host.remove();
    global.IntersectionObserver = originalObserver;
});

test('finishes fading compact navigation in when the header meets the panel', () => {
    const navigation = host.querySelector('[aria-label="Навигация по странице"]');
    Object.defineProperty(navigation, 'offsetHeight', { value: 80 });

    expect(host.querySelector('[data-testid="full-header"]').parentElement.className).toBe('fullHeader');
    expect(navigation.style.opacity).toBe('0');
    expect(navigation.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('[aria-label="Назад"]')).toBeNull();

    act(() => { intersect([{ intersectionRatio: 0.82, boundingClientRect: { height: 400 } }]); });
    expect(navigation.style.opacity).toBe('0');

    act(() => { intersect([{ intersectionRatio: 0.51, boundingClientRect: { height: 400 } }]); });
    expect(Number(navigation.style.opacity)).toBeCloseTo(0.5);
    expect(navigation.getAttribute('aria-hidden')).toBe('false');

    act(() => { intersect([{ intersectionRatio: 0.2, boundingClientRect: { height: 400 } }]); });
    expect(navigation.style.opacity).toBe('1');
    expect(host.textContent).toContain('Длинное название альбома');
});
