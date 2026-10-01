import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { PlaybackTimingPanel } from './PlaybackTimingPanel';
import { PLAYBACK_TIMING_EVENT } from '../../utils/playbackMetrics';

test('shows playback timing on screen and expands the breakdown', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
        ReactDOM.render(<PlaybackTimingPanel />, container);
    });
    act(() => {
        window.dispatchEvent(new CustomEvent(PLAYBACK_TIMING_EVENT, {
            detail: {
                trackId: 'track-id',
                title: 'Test track',
                totalMs: 1234,
                metrics: [
                    { label: 'Получение источника', durationMs: 500 },
                    { label: 'YouTube player API', durationMs: 456 },
                    { label: 'SABR первый media: сеть', durationMs: 123 }
                ]
            }
        }));
    });

    expect(document.body.textContent).toContain('Запуск: 1234 мс');
    act(() => document.querySelector('[aria-label="Замеры запуска трека"] .summary').click());
    expect(document.body.textContent).toContain('YouTube player API');
    expect(document.body.textContent).toContain('456 мс');
    expect(document.querySelectorAll('[data-depth="0"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-depth="1"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-depth="2"]')).toHaveLength(1);

    act(() => {
        ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
});

test('keeps an expanded result open for late diagnostics and respects manual close', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const result = {
        trackId: 'track-id',
        title: 'Test track',
        totalMs: 1234,
        metrics: [{ label: 'YouTube player API', durationMs: 456 }]
    };

    act(() => {
        ReactDOM.render(<PlaybackTimingPanel />, container);
    });
    act(() => {
        window.dispatchEvent(new CustomEvent(PLAYBACK_TIMING_EVENT, { detail: result }));
    });
    act(() => {
        document.querySelector('[aria-label="Замеры запуска трека"] .summary').click();
    });

    result.metrics.push({ label: 'Завершение ответа сервера', durationMs: 789 });
    act(() => {
        window.dispatchEvent(new CustomEvent(PLAYBACK_TIMING_EVENT, { detail: result }));
    });

    expect(document.body.textContent).toContain('Скрыть');
    expect(document.body.textContent).toContain('Завершение ответа сервера');
    expect(document.body.textContent).toContain('789 мс');

    act(() => {
        document.querySelector('[aria-label="Закрыть замеры"]').click();
    });
    result.metrics.push({ label: 'Поздний замер', durationMs: 1000 });
    act(() => {
        window.dispatchEvent(new CustomEvent(PLAYBACK_TIMING_EVENT, { detail: result }));
    });
    expect(document.querySelector('[aria-label="Замеры запуска трека"]')).toBeNull();

    act(() => {
        ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
});
