import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import api, { axiosBaseQuery, instance } from './apiClient';
import { YouTubeAuthControl } from './components/Auth/YouTubeAuthControl';

const authenticated = {
    status: 'authenticated',
    user: { email: 'listener@example.com', name: 'Listener' },
    musicConnection: 'connected',
    musicRecommendationsAvailable: true
};
let store;
let container;
let request;

beforeEach(() => {
    store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: defaults => defaults().concat(api.middleware)
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    request = jest.spyOn(instance, 'request');
});

afterEach(() => {
    act(() => { ReactDOM.unmountComponentAtNode(container); });
    store.dispatch(api.util.resetApiState());
    container.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
});

const renderHeader = async () => {
    await act(async () => {
        ReactDOM.render(
            <MemoryRouter><Provider store={store}><YouTubeAuthControl /></Provider></MemoryRouter>,
            container
        );
    });
};

test('header loads status once, shares it with pages and does not poll while idle', async () => {
    jest.useFakeTimers();
    request.mockResolvedValue({ data: authenticated });
    await renderHeader();
    await store.dispatch(api.endpoints.getYouTubeAuthStatus.initiate());
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0].url).toBe('/api/auth/status');
    expect(container.textContent).toContain('Listener');
});

test('denied protected request refreshes the shared authentication status', async () => {
    request.mockImplementation(({ url }) => url === '/api/home'
        ? Promise.reject({ response: { status: 401 } })
        : Promise.resolve({ data: request.mock.calls.length === 1 ? authenticated : { status: 'anonymous' } }));
    await store.dispatch(api.endpoints.getYouTubeAuthStatus.initiate());
    await store.dispatch(api.endpoints.getHome.initiate());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(request.mock.calls.map(([config]) => config.url)).toEqual([
        '/api/auth/status', '/api/home', '/api/auth/status'
    ]);
    expect(api.endpoints.getYouTubeAuthStatus.select()(store.getState()).data.status).toBe('anonymous');
});

test('only protected authentication failures invalidate status', async () => {
    const dispatch = jest.fn();
    const query = axiosBaseQuery();
    for (const [requiresAuth, status, refresh] of [
        [true, 401, true], [true, 409, true],
        [false, 401, false], [true, 500, false], [true, undefined, false]
    ]) {
        dispatch.mockClear();
        request.mockRejectedValue({ response: status ? { status } : undefined });
        await query({ url: '/test', method: 'GET', requiresAuth }, { dispatch });
        expect(dispatch).toHaveBeenCalledTimes(refresh ? 1 : 0);
    }
    dispatch.mockClear();
    request.mockResolvedValue({ data: {} });
    await query({ url: '/test', method: 'GET', requiresAuth: true }, { dispatch });
    expect(dispatch).not.toHaveBeenCalled();
});

test('anonymous header links to Google login', async () => {
    request.mockResolvedValue({ data: { status: 'anonymous' } });
    await renderHeader();
    expect(container.querySelector('a').getAttribute('href')).toBe('/api/auth/google/start');
    expect(container.textContent).toContain('Войти через Google');
});
