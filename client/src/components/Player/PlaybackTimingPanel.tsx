import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    PLAYBACK_TIMING_EVENT,
    PlaybackTimingResult
} from '../../utils/playbackMetrics';
import styles from './PlaybackTimingPanel.module.css';

const formatDuration = (duration: number) => `${Math.round(duration)} мс`;

const summaryMetrics = new Set([
    'Получение источника',
    'DASH до инициализации',
    'После инициализации до звука'
]);

const metricDepth = (label: string): 0 | 1 | 2 => {
    if (summaryMetrics.has(label)) return 0;
    if (label.startsWith('SABR ') || label.endsWith(' HTTP') || label.includes('серверное завершение')) return 2;
    return 1;
};

const copyText = async (text: string): Promise<void> => {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
};

export const PlaybackTimingPanel: React.FC = () => {
    const [result, setResult] = useState<PlaybackTimingResult | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const currentSource = useRef<PlaybackTimingResult | null>(null);
    const dismissedSource = useRef<PlaybackTimingResult | null>(null);

    useEffect(() => {
        const onTiming = (event: Event) => {
            const nextResult = (event as CustomEvent<PlaybackTimingResult>).detail;
            if (dismissedSource.current === nextResult) return;

            const updatesCurrentResult = currentSource.current === nextResult;
            currentSource.current = nextResult;
            dismissedSource.current = null;
            // Late diagnostics mutate the completed result; clone it so React renders them.
            setResult({ ...nextResult, metrics: [...nextResult.metrics] });
            if (!updatesCurrentResult) setExpanded(false);
            setCopied(false);
        };
        window.addEventListener(PLAYBACK_TIMING_EVENT, onTiming);
        return () => window.removeEventListener(PLAYBACK_TIMING_EVENT, onTiming);
    }, []);

    const report = useMemo(() => {
        if (!result) return '';
        return [
            `${result.title}: ${formatDuration(result.totalMs)}`,
            ...result.metrics.map(metric => `${metric.label}: ${formatDuration(metric.durationMs)}${metric.detail ? ` (${metric.detail})` : ''}`)
        ].join('\n');
    }, [result]);

    if (!result) return null;

    return createPortal(
        <aside className={styles.panel} aria-label='Замеры запуска трека'>
            <div className={styles.header}>
                <button className={styles.summary} onClick={() => setExpanded(value => !value)}>
                    <span className={styles.title}>Запуск: {formatDuration(result.totalMs)}</span>
                    <span className={styles.hint}>{expanded ? 'Скрыть' : 'Подробнее'}</span>
                </button>
                <button
                    className={styles.close}
                    onClick={() => {
                        dismissedSource.current = currentSource.current;
                        currentSource.current = null;
                        setResult(null);
                    }}
                    aria-label='Закрыть замеры'
                >×</button>
            </div>
            {expanded && (
                <div className={styles.details}>
                    <div className={styles.track}>{result.title}</div>
                    {result.metrics.map(metric => {
                        const depth = metricDepth(metric.label);
                        const depthClass = depth === 0 ? styles.depth0 : depth === 1 ? styles.depth1 : styles.depth2;
                        return (
                        <div className={`${styles.metric} ${depthClass}`} data-depth={depth} key={metric.label}>
                            <span>
                                {metric.label}
                                {metric.detail && <small>{metric.detail}</small>}
                            </span>
                            <strong>{formatDuration(metric.durationMs)}</strong>
                        </div>
                        );
                    })}
                    <button
                        className={styles.copy}
                        onClick={() => void copyText(report).then(() => setCopied(true)).catch(() => setCopied(false))}
                    >
                        {copied ? 'Скопировано' : 'Скопировать замеры'}
                    </button>
                </div>
            )}
        </aside>,
        document.body
    );
};
