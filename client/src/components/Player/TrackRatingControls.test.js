import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { TrackRatingControls } from './TrackRatingControls';
import { useGetTrackPlaybackQuery, useSetTrackRatingMutation } from '../../apiClient';

jest.mock('../../apiClient', () => ({
    useGetTrackPlaybackQuery: jest.fn(),
    useSetTrackRatingMutation: jest.fn()
}));

let container;
let setRating;

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    setRating = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
    useSetTrackRatingMutation.mockReturnValue([setRating, { isLoading: false }]);
});

afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    jest.clearAllMocks();
});

test('toggles the current rating off and switches to the opposite rating', async () => {
    useGetTrackPlaybackQuery.mockReturnValue({ currentData: { rating: 'LIKE' }, isLoading: false });
    await act(async () => ReactDOM.render(<TrackRatingControls trackId='track-1' />, container));
    expect(container.querySelector('[data-testid="ThumbUpRoundedIcon"]')).not.toBeNull();

    await act(async () => container.querySelector('[aria-label="Убрать лайк"]').click());
    expect(setRating).toHaveBeenLastCalledWith({ id: 'track-1', rating: 'INDIFFERENT' });
    expect(container.querySelector('[data-testid="ThumbUpOutlinedIcon"]')).not.toBeNull();

    await act(async () => container.querySelector('[aria-label="Не нравится"]').click());
    expect(setRating).toHaveBeenLastCalledWith({ id: 'track-1', rating: 'DISLIKE' });
    expect(container.querySelector('[aria-label="Убрать дизлайк"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="ThumbDownRoundedIcon"]')).not.toBeNull();
});

test('shows the fetched rating when the current track changes', async () => {
    useGetTrackPlaybackQuery.mockImplementation(trackId => ({
        currentData: { rating: trackId === 'track-1' ? 'LIKE' : 'DISLIKE' },
        isLoading: false
    }));

    await act(async () => ReactDOM.render(<TrackRatingControls trackId='track-1' />, container));
    expect(container.querySelector('[data-testid="ThumbUpRoundedIcon"]')).not.toBeNull();

    await act(async () => ReactDOM.render(<TrackRatingControls trackId='track-2' />, container));
    expect(container.querySelector('[data-testid="ThumbDownRoundedIcon"]')).not.toBeNull();
});
