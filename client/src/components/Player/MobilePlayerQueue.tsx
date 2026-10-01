import React, { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { QueueContent } from '../../pages/Queue/QueueContent';
import styles from './MobilePlayerQueue.module.css';

interface MobilePlayerQueueProps {
    stage: QueueStage;
    onStageChange: (stage: QueueStage) => void;
    onProgress: (progress: number) => void;
}

export type QueueStage = 0 | 1 | 2;

export interface MobilePlayerQueueHandle {
    begin: (y: number, time: number) => void;
    move: (y: number, time: number) => boolean;
    finish: (y: number, time: number, cancelled?: boolean) => void;
}

const clamp = (value: number) => Math.max(0, Math.min(2, value));
const fraction = (value: number) => Math.max(0, Math.min(1, value));
const TRANSITION_MS = 320;

export const MobilePlayerQueue = React.memo(forwardRef<MobilePlayerQueueHandle, MobilePlayerQueueProps>(({ stage, onStageChange, onProgress }, ref) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const travelRef = useRef({ middle: 1, full: 2, contentExtent: 2 });
    const progressRef = useRef<number>(stage);
    const animationRef = useRef<number | null>(null);
    const suppressClickRef = useRef(false);
    const gestureRef = useRef<{ y: number; lastY: number; time: number; velocity: number; progress: number; dragging: boolean } | null>(null);

    const positionFor = useCallback((progress: number) => {
        const { middle, full } = travelRef.current;
        return progress <= 1 ? full - (full - middle) * progress : middle * (2 - progress);
    }, []);

    const progressFor = useCallback((position: number) => {
        const { middle, full } = travelRef.current;
        return position >= middle
            ? fraction((full - position) / (full - middle))
            : 1 + fraction((middle - position) / middle);
    }, []);

    const paint = useCallback((progress: number) => {
        const panel = panelRef.current;
        if (!panel) return;
        const next = progressRef.current = clamp(progress);
        if (contentRef.current) contentRef.current.style.visibility = next > 0 ? 'visible' : 'hidden';
        panel.style.setProperty('--queue-progress', String(Math.min(next, 1)));
        const position = positionFor(next);
        panel.style.transform = `translate3d(0, ${position}px, 0)`;
        panel.style.setProperty('--queue-content-height', `${Math.max(0, travelRef.current.contentExtent - position)}px`);
        onProgress(next);
    }, [onProgress, positionFor]);

    const stopAnimation = useCallback(() => {
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
    }, []);

    const settle = useCallback((target: number) => {
        stopAnimation();
        const from = progressRef.current;
        const to = clamp(target);
        if (from === to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            paint(to);
            return;
        }
        const start = performance.now();
        const frame = (now: number) => {
            const elapsed = fraction((now - start) / TRANSITION_MS);
            const eased = 1 - Math.pow(1 - elapsed, 3);
            paint(from + (to - from) * eased);
            animationRef.current = elapsed < 1 ? requestAnimationFrame(frame) : null;
        };
        animationRef.current = requestAnimationFrame(frame);
    }, [paint, stopAnimation]);

    const measure = useCallback(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const style = getComputedStyle(panel);
        const peek = Number.parseFloat(style.getPropertyValue('--queue-peek')) || 76;
        const handleHeight = Number.parseFloat(style.getPropertyValue('--queue-handle-height')) || 48;
        const full = Math.max(2, panel.offsetHeight - peek);
        const middleHeight = Math.min(window.innerHeight * 0.4, 560);
        const middle = Math.max(1, panel.offsetHeight - middleHeight);
        travelRef.current = { middle, full, contentExtent: panel.offsetHeight - handleHeight };
        paint(progressRef.current);
    }, [paint]);

    useLayoutEffect(() => {
        measure();
        settle(stage);
    }, [stage, measure, settle]);

    useLayoutEffect(() => stopAnimation, [stopAnimation]);

    useLayoutEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const observer = new ResizeObserver(measure);
        observer.observe(panel);
        return () => observer.disconnect();
    }, [measure]);

    const begin = (y: number, time: number) => {
        stopAnimation();
        suppressClickRef.current = false;
        gestureRef.current = { y, lastY: y, time, velocity: 0, progress: progressRef.current, dragging: false };
        paint(progressRef.current);
    };

    const move = (y: number, time: number) => {
        const gesture = gestureRef.current;
        if (!gesture) return false;
        const dy = y - gesture.y;
        if (!gesture.dragging) {
            if (Math.abs(dy) < 7) return false;
            gesture.dragging = true;
            suppressClickRef.current = true;
        }
        if (time > gesture.time) gesture.velocity = (y - gesture.lastY) / (time - gesture.time);
        gesture.lastY = y;
        gesture.time = time;
        paint(progressFor(positionFor(gesture.progress) + dy));
        return true;
    };

    const finish = (y: number, time: number, cancelled = false) => {
        const gesture = gestureRef.current;
        gestureRef.current = null;
        if (!gesture?.dragging) {
            settle(stage);
            return;
        }
        const dy = y - gesture.y;
        const recentVelocity = time - gesture.time < 100 ? gesture.velocity : 0;
        const direction = Math.abs(dy) >= 88 ? Math.sign(-dy) : Math.abs(recentVelocity) > 0.45 ? Math.sign(-recentVelocity) : 0;
        const target = cancelled ? stage : direction ? clamp(stage + direction) as QueueStage : Math.round(progressRef.current) as QueueStage;
        if (target !== stage) onStageChange(target);
        else settle(stage);
    };

    useImperativeHandle(ref, () => ({ begin, move, finish }));

    return (
        <section ref={panelRef} className={styles.panel} data-player-queue aria-label='Очередь воспроизведения'>
            <div
                className={styles.handle}
                role='button'
                tabIndex={0}
                aria-expanded={stage > 0}
                aria-label={stage === 2 ? 'Свернуть очередь' : 'Открыть очередь'}
                onClick={() => {
                    if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                    }
                    onStageChange(stage === 2 ? 1 : stage + 1 as QueueStage);
                }}
                onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onStageChange(stage === 2 ? 1 : stage + 1 as QueueStage);
                    }
                }}
                onPointerDown={event => {
                    if (event.pointerType === 'mouse' && event.button === 0) begin(event.clientY, event.timeStamp);
                }}
                onPointerMove={event => {
                    if (event.pointerType === 'mouse' && move(event.clientY, event.timeStamp)) event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerUp={event => { if (event.pointerType === 'mouse') finish(event.clientY, event.timeStamp); }}
                onPointerCancel={event => { if (event.pointerType === 'mouse') finish(event.clientY, event.timeStamp, true); }}
                onTouchStart={event => {
                    const touch = event.touches[0];
                    if (event.touches.length === 1 && touch) begin(touch.clientY, event.timeStamp);
                }}
                onTouchMove={event => {
                    const touch = event.touches[0];
                    if (touch && move(touch.clientY, event.timeStamp)) event.preventDefault();
                }}
                onTouchEnd={event => {
                    const touch = event.changedTouches[0];
                    if (touch) finish(touch.clientY, event.timeStamp);
                }}
                onTouchCancel={event => finish(gestureRef.current?.lastY ?? 0, event.timeStamp, true)}
            >
                <span className={styles.grabber} />
                {stage === 0 && <span className={styles.label}>Очередь</span>}
            </div>
            <div ref={contentRef} className={styles.content}><QueueContent embedded /></div>
        </section>
    );
}));

MobilePlayerQueue.displayName = 'MobilePlayerQueue';
