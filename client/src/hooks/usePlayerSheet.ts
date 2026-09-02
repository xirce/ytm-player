import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';

export const PLAYER_TRANSITION_MS = 400;
const INTERACTIVE = 'button, [role="button"], input, [role="slider"], .MuiSlider-root';
const clamp = (value: number) => Math.max(0, Math.min(1, value));

interface Gesture {
    x: number;
    y: number;
    lastY: number;
    time: number;
    velocity: number;
    progress: number;
    open: boolean;
    dragging: boolean;
}

export const usePlayerSheet = (enabled: boolean, expanded: boolean, setExpanded: (value: boolean) => void) => {
    const ref = useRef<HTMLDivElement>(null);
    const frame = useRef<number | null>(null);
    const animation = useRef<{ items: Animation[]; from: number; to: number } | null>(null);
    const progress = useRef(expanded ? 1 : 0);
    const travel = useRef(1);
    const geometry = useRef({ navHeight: 64, mini: { x: 0, y: 0, width: 48, height: 48 }, full: { x: 0, y: 0, width: 1, height: 1 } });
    const layers = useRef<{
        panel: HTMLElement | null;
        artwork: HTMLElement | null;
        mini: HTMLElement | null;
        full: HTMLElement[];
        navigation: HTMLElement | null;
    }>({ panel: null, artwork: null, mini: null, full: [], navigation: null });
    const gesture = useRef<Gesture | null>(null);
    const suppressClick = useRef(false);
    const initialized = useRef(false);
    const state = useRef({ expanded, setExpanded });
    state.current = { expanded, setExpanded };
    const [visible, setVisible] = useState(expanded);

    const paint = useCallback((value: number) => {
        const element = ref.current;
        if (!element) return;
        const p = progress.current = clamp(value);
        const { navHeight, mini, full } = geometry.current;
        const { panel, artwork, mini: miniLayer, full: fullLayers, navigation } = layers.current;
        const panelY = travel.current * (1 - p);
        if (panel) panel.style.transform = `translate3d(0, ${panelY}px, 0)`;
        if (artwork) {
            // Artwork is a sibling layer: one screen-space transform, no moving/scaling ancestor.
            const x = mini.x + (full.x - mini.x) * p;
            const y = panelY + mini.y + (full.y - mini.y) * p;
            const scaleX = (mini.width + (full.width - mini.width) * p) / full.width;
            const scaleY = (mini.height + (full.height - mini.height) * p) / full.height;
            artwork.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scaleX}, ${scaleY})`;
        }
        if (miniLayer) miniLayer.style.opacity = String(1 - p);
        for (const layer of fullLayers) layer.style.opacity = String(p);
        if (navigation) navigation.style.transform = `translate3d(0, ${navHeight * p}px, 0)`;
        const playerState = p <= 0 ? 'closed' : p >= 1 ? 'open' : 'moving';
        if (element.dataset.playerState !== playerState) element.dataset.playerState = playerState;
    }, []);

    const stopAnimation = useCallback(() => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
        const active = animation.current;
        if (!active) return;
        const fraction = active.items[0].effect?.getComputedTiming().progress ?? 0;
        paint(active.from + (active.to - active.from) * fraction);
        animation.current = null;
        active.items.forEach(item => item.cancel());
    }, [paint]);

    const measure = useCallback(() => {
        const element = ref.current;
        if (!element) return;
        const height = element.offsetHeight;
        const navigation = document.querySelector<HTMLElement>('[data-player-navigation]');
        const navHeight = navigation?.offsetHeight || 64;
        const panel = element.querySelector<HTMLElement>('[data-player-panel]');
        layers.current = {
            panel,
            navigation,
            artwork: element.querySelector<HTMLElement>('[data-player-shared-artwork]'),
            mini: element.querySelector<HTMLElement>('[data-player-layer="mini"]'),
            full: Array.from(element.querySelectorAll<HTMLElement>('[data-player-panel] > [data-player-layer="full"]'))
        };
        geometry.current.navHeight = navHeight;
        travel.current = Math.max(1, height - navHeight - 64);
        const origin = (panel ?? element).getBoundingClientRect();
        for (const size of ['mini', 'full'] as const) {
            const artwork = element.querySelector(`[data-player-artwork="${size}"]`);
            if (!artwork) continue;
            const rect = artwork.getBoundingClientRect();
            if (rect.width && rect.height) geometry.current[size] = {
                x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height
            };
        }
        // Read all layout first. The texture stays full size throughout the gesture.
        const artwork = layers.current.artwork;
        if (artwork) {
            artwork.style.width = `${geometry.current.full.width}px`;
            artwork.style.height = `${geometry.current.full.height}px`;
        }
        paint(progress.current);
    }, [paint]);

    const resetStyles = useCallback(() => {
        layers.current.panel?.style.removeProperty('transform');
        layers.current.navigation?.style.removeProperty('transform');
        layers.current.full.forEach(layer => layer.style.removeProperty('opacity'));
    }, []);

    const settle = useCallback((open: boolean, animate = true) => {
        stopAnimation();
        const from = progress.current;
        const to = open ? 1 : 0;
        if (!animate || from === to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            paint(to);
            setVisible(open);
            return;
        }
        setVisible(true);
        const element = ref.current;
        if (element && typeof element.animate === 'function') {
            const targets = [
                ...[layers.current.panel, layers.current.artwork, layers.current.navigation]
                    .filter((target): target is HTMLElement => target !== null)
                    .map(target => ({ target, property: 'transform' as const })),
                ...[layers.current.mini, ...layers.current.full]
                    .filter((target): target is HTMLElement => target !== null)
                    .map(target => ({ target, property: 'opacity' as const }))
            ];
            const snapshot = () => targets.map(({ target, property }) => ({ [property]: target.style[property] }));
            paint(from);
            const first = snapshot();
            paint(to);
            const last = snapshot();
            paint(from);
            element.dataset.playerState = 'moving';
            // Native transform/opacity animations keep running when playback or React occupies the main thread.
            const items = targets.map(({ target }, index) => target.animate([first[index], last[index]], {
                duration: PLAYER_TRANSITION_MS, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'both'
            }));
            const startTime = document.timeline.currentTime;
            if (startTime !== null) items.forEach(item => { item.startTime = startTime; });
            animation.current = { items, from, to };
            items[0].onfinish = () => {
                if (animation.current?.items !== items) return;
                paint(to);
                animation.current = null;
                items.forEach(item => item.cancel());
                setVisible(open);
            };
            return;
        }
        const start = performance.now();
        const tick = (now: number) => {
            const elapsed = clamp((now - start) / PLAYER_TRANSITION_MS);
            paint(from + (to - from) * (1 - Math.pow(1 - elapsed, 3)));
            if (elapsed < 1) frame.current = requestAnimationFrame(tick);
            else {
                frame.current = null;
                setVisible(open);
            }
        };
        frame.current = requestAnimationFrame(tick);
    }, [paint, stopAnimation]);

    useLayoutEffect(() => {
        gesture.current = null;
        if (enabled) {
            measure();
            settle(expanded, initialized.current);
        } else {
            stopAnimation();
            resetStyles();
            setVisible(expanded);
        }
        initialized.current = enabled;
    }, [enabled, expanded, measure, settle, stopAnimation, resetStyles]);

    useLayoutEffect(() => {
        if (!enabled) return;
        const resize = () => {
            gesture.current = null;
            measure();
            settle(state.current.expanded, false);
        };
        const observer = new ResizeObserver(measure);
        if (ref.current) observer.observe(ref.current);
        window.addEventListener('resize', resize);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', resize);
        };
    }, [enabled, measure, settle]);

    useLayoutEffect(() => () => {
        stopAnimation();
        resetStyles();
    }, [stopAnimation, resetStyles]);

    const begin = useCallback((target: EventTarget | null, x: number, y: number, time: number) => {
        suppressClick.current = false;
        if (!(target instanceof Element) || target.closest(INTERACTIVE)) return;
        stopAnimation();
        measure();
        gesture.current = {
            x, y, lastY: y, time, velocity: 0, progress: progress.current,
            open: state.current.expanded, dragging: false
        };
    }, [measure, stopAnimation]);

    const move = useCallback((x: number, y: number, time: number) => {
        const start = gesture.current;
        if (!start) return false;
        const dy = y - start.y;
        if (!start.dragging) {
            if (Math.max(Math.abs(x - start.x), Math.abs(dy)) < 8) return false;
            if (Math.abs(x - start.x) > Math.abs(dy)) {
                gesture.current = null;
                settle(state.current.expanded);
                return false;
            }
            start.dragging = true;
            suppressClick.current = true;
            stopAnimation();
            setVisible(true);
        }
        if (time > start.time) start.velocity = (y - start.lastY) / (time - start.time);
        start.lastY = y;
        start.time = time;
        progress.current = clamp(start.progress - dy / travel.current);
        if (frame.current === null) frame.current = requestAnimationFrame(() => {
            frame.current = null;
            paint(progress.current);
        });
        return true;
    }, [paint, stopAnimation, settle]);

    const finish = useCallback((y: number, time: number, cancelled = false) => {
        const start = gesture.current;
        gesture.current = null;
        if (!start) return;
        if (!start.dragging) {
            settle(state.current.expanded);
            return;
        }
        const direction = start.open ? 1 : -1;
        const distance = (y - start.y) * direction;
        const velocity = time - start.time < 100 ? start.velocity * direction : 0;
        const commit = !cancelled && (distance >= 88 || (distance >= 28 && velocity > 0.45));
        const open = commit ? !start.open : start.open;
        if (open === state.current.expanded) settle(open);
        else state.current.setExpanded(open);
    }, [settle]);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!enabled || !element) return;
        const cancel = () => finish(gesture.current?.lastY ?? 0, performance.now(), true);
        const start = (event: TouchEvent) => {
            if (event.touches.length !== 1) return cancel();
            const touch = event.touches[0];
            begin(event.target, touch.clientX, touch.clientY, event.timeStamp);
        };
        const drag = (event: TouchEvent) => {
            if (event.touches.length !== 1) return cancel();
            const touch = event.touches[0];
            if (move(touch.clientX, touch.clientY, event.timeStamp) && event.cancelable) event.preventDefault();
        };
        const end = (event: TouchEvent) => {
            const touch = event.changedTouches[0];
            if (touch) finish(touch.clientY, event.timeStamp);
        };
        // Native non-passive touchmove keeps WebKit from taking over image/mini swipes.
        element.addEventListener('touchstart', start, { passive: true });
        element.addEventListener('touchmove', drag, { passive: false });
        element.addEventListener('touchend', end);
        element.addEventListener('touchcancel', cancel);
        return () => {
            element.removeEventListener('touchstart', start);
            element.removeEventListener('touchmove', drag);
            element.removeEventListener('touchend', end);
            element.removeEventListener('touchcancel', cancel);
        };
    }, [enabled, begin, move, finish]);

    return {
        ref,
        visible,
        handlers: {
            onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
                if (!enabled || event.pointerType !== 'mouse' || event.button !== 0) return;
                begin(event.target, event.clientX, event.clientY, event.timeStamp);
            },
            onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
                if (event.pointerType === 'mouse' && move(event.clientX, event.clientY, event.timeStamp)) {
                    event.currentTarget.setPointerCapture(event.pointerId);
                }
            },
            onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
                if (event.pointerType === 'mouse') finish(event.clientY, event.timeStamp);
            },
            onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => {
                if (event.pointerType === 'mouse') finish(event.clientY, event.timeStamp, true);
            },
            onLostPointerCapture: (event: React.PointerEvent<HTMLDivElement>) => {
                if (event.pointerType === 'mouse') finish(event.clientY, event.timeStamp, true);
            },
            onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
                if (!suppressClick.current) return;
                suppressClick.current = false;
                event.preventDefault();
                event.stopPropagation();
            },
            onDragStart: (event: React.DragEvent<HTMLDivElement>) => { if (enabled) event.preventDefault(); }
        }
    };
};
