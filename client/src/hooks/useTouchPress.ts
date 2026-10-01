import { useRef, useState } from 'react';
import type { TouchEvent } from 'react';

export const useTouchPress = () => {
    const [pressed, setPressed] = useState(false);
    const start = useRef<{ x: number; y: number } | null>(null);
    const release = () => {
        start.current = null;
        setPressed(false);
    };

    return {
        pressed,
        touchHandlers: {
            onTouchStart: (event: TouchEvent<HTMLElement>) => {
                if (event.touches.length !== 1) return release();
                const touch = event.touches[0];
                start.current = { x: touch.clientX, y: touch.clientY };
                setPressed(true);
            },
            onTouchMove: (event: TouchEvent<HTMLElement>) => {
                const touch = event.touches[0];
                if (!touch || !start.current
                    || Math.hypot(touch.clientX - start.current.x, touch.clientY - start.current.y) > 10) {
                    release();
                }
            },
            onTouchEnd: release,
            onTouchCancel: release
        }
    };
};
