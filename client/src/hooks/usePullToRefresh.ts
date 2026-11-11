import { RefObject, useEffect, useRef, useState } from 'react';

export type PullToRefreshPhase = 'idle' | 'pulling' | 'armed' | 'refreshing' | 'settling';

interface PullToRefreshOptions {
    scrollContainerRef: RefObject<HTMLElement> | null;
    disabled?: boolean;
    onRefresh: () => Promise<unknown>;
}

interface PullToRefreshState {
    distance: number;
    phase: PullToRefreshPhase;
    progress: number;
}

const ACTIVATION_DISTANCE = 8;
const REFRESH_THRESHOLD = 64;
const REFRESH_HOLD_DISTANCE = 52;
const MAX_PULL_DISTANCE = 112;
const DRAG_RESISTANCE = 0.5;
const SETTLE_DURATION_MS = 180;

export const usePullToRefresh = ({
    scrollContainerRef,
    disabled = false,
    onRefresh
}: PullToRefreshOptions): PullToRefreshState => {
    const [distance, setDistance] = useState(0);
    const [phase, setPhase] = useState<PullToRefreshPhase>('idle');
    const distanceRef = useRef(0);
    const refreshingRef = useRef(false);
    const onRefreshRef = useRef(onRefresh);
    const settleTimerRef = useRef<number>();

    onRefreshRef.current = onRefresh;

    useEffect(() => {
        const container = scrollContainerRef?.current;
        if (!container || disabled) {
            distanceRef.current = 0;
            refreshingRef.current = false;
            setDistance(0);
            setPhase('idle');
            return;
        }

        let startX = 0;
        let startY = 0;
        let tracking = false;
        let direction: 'horizontal' | 'vertical' | null = null;
        let active = true;

        const settle = () => {
            if (!active) return;
            refreshingRef.current = false;
            distanceRef.current = 0;
            setPhase('settling');
            setDistance(0);
            window.clearTimeout(settleTimerRef.current);
            settleTimerRef.current = window.setTimeout(() => setPhase('idle'), SETTLE_DURATION_MS);
        };

        const start = (event: TouchEvent) => {
            if (event.touches.length !== 1 || refreshingRef.current || container.scrollTop > 0) return;
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
            tracking = true;
            direction = null;
        };

        const move = (event: TouchEvent) => {
            if (!tracking || event.touches.length !== 1) return;
            const deltaX = event.touches[0].clientX - startX;
            const deltaY = event.touches[0].clientY - startY;

            if (!direction && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= ACTIVATION_DISTANCE) {
                direction = Math.abs(deltaY) > Math.abs(deltaX) ? 'vertical' : 'horizontal';
            }
            if (direction === 'horizontal') {
                tracking = false;
                return;
            }
            if (direction !== 'vertical' || container.scrollTop > 0) return;
            if (deltaY <= 0) {
                distanceRef.current = 0;
                setDistance(0);
                setPhase('pulling');
                return;
            }

            event.preventDefault();
            const nextDistance = Math.min(MAX_PULL_DISTANCE, deltaY * DRAG_RESISTANCE);
            distanceRef.current = nextDistance;
            setDistance(nextDistance);
            setPhase(nextDistance >= REFRESH_THRESHOLD ? 'armed' : 'pulling');
        };

        const end = () => {
            if (!tracking) return;
            tracking = false;
            direction = null;
            if (distanceRef.current < REFRESH_THRESHOLD) {
                settle();
                return;
            }

            refreshingRef.current = true;
            distanceRef.current = REFRESH_HOLD_DISTANCE;
            setDistance(REFRESH_HOLD_DISTANCE);
            setPhase('refreshing');
            void Promise.resolve(onRefreshRef.current()).catch(() => undefined).finally(settle);
        };

        const cancel = () => {
            if (!tracking) return;
            tracking = false;
            direction = null;
            settle();
        };

        container.addEventListener('touchstart', start, { passive: true });
        container.addEventListener('touchmove', move, { passive: false });
        container.addEventListener('touchend', end, { passive: true });
        container.addEventListener('touchcancel', cancel, { passive: true });
        return () => {
            active = false;
            container.removeEventListener('touchstart', start);
            container.removeEventListener('touchmove', move);
            container.removeEventListener('touchend', end);
            container.removeEventListener('touchcancel', cancel);
            window.clearTimeout(settleTimerRef.current);
        };
    }, [disabled, scrollContainerRef]);

    return {
        distance,
        phase,
        progress: phase === 'refreshing' ? 1 : Math.min(1, distance / REFRESH_THRESHOLD)
    };
};
