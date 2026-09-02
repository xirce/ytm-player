import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useGetHomeQuery, useGetYouTubeAuthStatusQuery, useLazyGetHomeContinuationQuery, useLazyGetHomeSectionQuery } from '../../apiClient';
import { Track } from '../../components/Track/Track';
import { HomePage } from './HomePage';

jest.mock('@mui/material/useMediaQuery', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../apiClient', () => ({
    useGetHomeQuery: jest.fn(),
    useGetYouTubeAuthStatusQuery: jest.fn(),
    useLazyGetHomeContinuationQuery: jest.fn(),
    useLazyGetHomeSectionQuery: jest.fn()
}));
jest.mock('../../components/Track/Track', () => ({
    Track: jest.fn()
}));
jest.mock('../../components/SearchResult/Album', () => ({ Album: () => <a data-card='album'>Album</a> }));
jest.mock('../../components/SearchResult/Playlist', () => ({ Playlist: () => <a data-card='playlist'>Playlist</a> }));
jest.mock('../../components/SearchResult/Artist', () => ({ Artist: () => <a data-card='artist'>Artist</a> }));

const again = {
    title: 'Послушать ещё раз',
    items: [...Array.from({ length: 9 }, (_, index) => ({ type: 'track', data: { id: `track-${index}` } })),
        ...['artist', 'album', 'playlist'].map(type => ({ type, data: { id: type } }))]
};
const quick = { title: 'Quick picks', items: [] };
const other = { title: 'Новые альбомы', items: [] };
let host, navigate, intersect, loadContinuation, loadSection;
const originalObserver = global.IntersectionObserver;
const originalScroll = HTMLElement.prototype.scrollIntoView;

function Harness() {
    navigate = useNavigate();
    return <HomePage />;
}

function mount(sections = [other, quick, again], continuation = null) {
    useGetHomeQuery.mockReturnValue({ data: { sections, continuation } });
    act(() => { ReactDOM.render(<MemoryRouter><Harness /></MemoryRouter>, host); });
}

const headings = () => Array.from(host.querySelectorAll('h2'), heading => heading.textContent);
const click = selector => act(() => { host.querySelector(selector).click(); });

beforeEach(() => {
    jest.clearAllMocks();
    host = document.createElement('div');
    document.body.appendChild(host);
    useMediaQuery.mockReturnValue(true);
    Track.mockImplementation(({ source, index }) => <button data-card='track'>{source[index].id}</button>);
    useGetYouTubeAuthStatusQuery.mockReturnValue({ data: { status: 'authenticated', musicRecommendationsAvailable: true } });
    loadContinuation = jest.fn();
    useLazyGetHomeContinuationQuery.mockReturnValue([loadContinuation, {}]);
    loadSection = jest.fn();
    useLazyGetHomeSectionQuery.mockReturnValue([loadSection, {}]);
    global.IntersectionObserver = jest.fn(callback => {
        intersect = callback;
        return { observe: jest.fn(), disconnect: jest.fn() };
    });
    HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterEach(() => {
    act(() => { ReactDOM.unmountComponentAtNode(host); });
    host.remove();
    global.IntersectionObserver = originalObserver;
    HTMLElement.prototype.scrollIntoView = originalScroll;
});

test('mobile preview puts listen again first with nine cards per page and overlay captions', () => {
    mount();
    expect(headings()).toEqual([again.title, quick.title, other.title]);
    expect(host.querySelector('[role="group"]').querySelectorAll('[data-card]')).toHaveLength(9);
    expect(host.querySelectorAll('[role="group"]')).toHaveLength(2);
    expect(host.querySelector('[data-cover-caption="true"]')).not.toBeNull();
    expect(host.querySelector('[data-card]').parentElement.className).toContain('listenAgainGrid');
    const props = Track.mock.calls[8][0];
    expect(props.index).toBe(8);
    expect(props.source).toEqual(again.items.slice(0, 9).map(item => item.data));
});

test('expansion shows every item type, hides other sections, and supports button and browser back', () => {
    mount();
    click('[aria-label^="Показать все"]');
    expect(headings()).toEqual([again.title]);
    expect(host.querySelectorAll('[data-card]')).toHaveLength(12);
    expect(host.querySelector('[data-cover-caption]')).toBeNull();
    expect(host.querySelector('[data-card]').parentElement.className).not.toContain('listenAgainGrid');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    click('[aria-label="Назад к разделам"]');
    expect(headings()).toHaveLength(3);
    expect(host.querySelector('[role="group"]').querySelectorAll('[data-card]')).toHaveLength(9);
    click('[aria-label^="Показать все"]');
    act(() => { navigate(-1); });
    expect(headings()).toHaveLength(3);
    expect(host.querySelector('[role="group"]').querySelectorAll('[data-card]')).toHaveLength(9);
});

test('desktop retains the complete existing card layout', () => {
    useMediaQuery.mockReturnValue(false);
    mount();
    expect(host.querySelectorAll('[data-card]')).toHaveLength(12);
    expect(host.querySelector('[aria-label^="Показать все"]')).toBeNull();
    expect(host.querySelector('[data-card]').parentElement.className).not.toContain('listenAgainGrid');
});

test('short sections have no filler cards and recognize the English title', () => {
    mount([other, { ...again, title: 'Listen again', items: again.items.slice(0, 2) }]);
    expect(headings()[0]).toBe('Listen again');
    expect(host.querySelectorAll('[data-card]')).toHaveLength(2);
    click('[aria-label^="Показать все"]');
    expect(host.querySelectorAll('[data-card]')).toHaveLength(2);
});

test('listen again arriving in a continuation moves first while duplicate sections stay deduplicated', async () => {
    loadContinuation.mockReturnValue({ unwrap: () => Promise.resolve({ sections: [again, quick], continuation: null }) });
    mount([other, quick], 'next-page');
    await act(async () => { intersect([{ isIntersecting: true }]); });
    expect(headings()).toEqual([again.title, quick.title, other.title]);
    expect(loadContinuation).toHaveBeenCalledWith('next-page', true);
});

test('horizontal scrolling updates dots, dots and arrow keys scroll by one page', () => {
    mount();
    const carousel = host.querySelector('[role="region"]');
    Object.defineProperty(carousel, 'clientWidth', { value: 360 });
    carousel.scrollTo = jest.fn();
    const scroll = left => act(() => {
        carousel.scrollLeft = left;
        carousel.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    scroll(360);
    expect(host.querySelector('[aria-current="page"]').getAttribute('aria-label')).toBe('Страница 2');
    click('[aria-label="Страница 1"]');
    expect(carousel.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
    scroll(0);
    act(() => { carousel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(carousel.scrollTo).toHaveBeenLastCalledWith({ left: 360, behavior: 'smooth' });
});

test('full list prefetches before the buffer runs out without duplicates or concurrent loads', async () => {
    const tracks = Array.from({ length: 40 }, (_, id) => ({ type: 'track', data: { id: `lazy-${id}` } }));
    mount([{ ...again, items: tracks, continuation: 'section-first' }]);
    expect(host.querySelectorAll('[data-card]')).toHaveLength(27);
    expect(host.querySelectorAll('[role="group"]')).toHaveLength(3);
    expect(loadSection).not.toHaveBeenCalled();
    click('[aria-label^="Показать все"]');
    expect(global.IntersectionObserver).toHaveBeenLastCalledWith(expect.any(Function), { rootMargin: '0px 0px 1200px 0px' });
    expect(host.querySelectorAll('[data-card]')).toHaveLength(18);
    act(() => { intersect([{ isIntersecting: false }]); });
    expect(host.querySelectorAll('[data-card]')).toHaveLength(18);
    act(() => { intersect([{ isIntersecting: true }]); });
    expect(host.querySelectorAll('[data-card]')).toHaveLength(36);
    expect(loadSection).not.toHaveBeenCalled();
    let resolve;
    loadSection.mockReturnValue({ unwrap: () => new Promise(done => { resolve = done; }) });
    act(() => { intersect([{ isIntersecting: true }]); });
    expect(host.querySelectorAll('[data-card]')).toHaveLength(40);
    expect(loadSection).toHaveBeenCalledWith('section-first', true);
    act(() => { intersect([{ isIntersecting: true }]); intersect([{ isIntersecting: true }]); });
    expect(loadSection).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ items: [tracks[0], { type: 'track', data: { id: 'new' } }], continuation: null }); });
    expect(host.querySelectorAll('[data-card]')).toHaveLength(41);
    expect(loadContinuation).not.toHaveBeenCalled();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    click('[aria-label="Назад к разделам"]');
    expect(host.querySelectorAll('[data-card]')).toHaveLength(27);
    expect(host.querySelectorAll('[aria-label="Страницы карусели"] button')).toHaveLength(3);
    expect(Array.from(host.querySelectorAll('[data-card]'), card => card.textContent))
        .toEqual(tracks.slice(0, 27).map(item => item.data.id));
    click('[aria-label^="Показать все"]');
    expect(host.querySelectorAll('[data-card]')).toHaveLength(41);
});
