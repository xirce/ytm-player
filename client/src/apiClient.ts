import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { BaseQueryFn } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/dist/query/react";
import {
    IAlbum,
    IArtist,
    IPlaylist,
    IPlaylistPage,
    ISearchResponse,
    IArtistInfo,
    IPlaylistInfo,
    ITrackBase,
    IAlbumInfo,
    IHomeFeed,
    IHomeSectionPage,
    AppAuthState,
    YouTubeMusicConnectionInput,
    YouTubeMusicConnectionState,
    ITrackPlaybackSource,
    ITrackRating,
    TrackRating
} from "../../shared";

export const instance = axios.create({
    headers: {
        "Content-type": "application/json"
    }
})

export const axiosBaseQuery = ({ baseUrl }: { baseUrl: string } = { baseUrl: '' }): BaseQueryFn<{
    url: string
    method: AxiosRequestConfig['method']
    data?: AxiosRequestConfig['data']
    params?: AxiosRequestConfig['params']
    requiresAuth?: boolean
}> => async ({ url, method, data, params, requiresAuth }, queryApi) => {
    try {
        const result = await instance.request({ url: baseUrl + url, method, data, params })
        return { data: result.data }
    } catch (axiosError) {
        let err = axiosError as AxiosError
        if (requiresAuth && (err.response?.status === 401 || err.response?.status === 409)) {
            queryApi.dispatch(api.util.invalidateTags(['Auth']));
        }
        return {
            error: {
                status: err.response?.status,
                data: err.response?.data || err.message,
            },
        }
    }
}

export interface ISearchRequest {
    query: string;
    type?: string;
}

export interface IPlaylistRequest {
    id: string;
    params?: string;
}

export interface IPlaylistContinuationRequest {
    id: string;
    continuation: string;
}

const knownTrackRatings = new Map<string, TrackRating>();

const api = createApi({
    reducerPath: 'api',
    baseQuery: axiosBaseQuery({ baseUrl: '/api' }),
    keepUnusedDataFor: 30,
    tagTypes: ['Home', 'History', 'Auth', 'TrackRating', 'Playlist'],
    endpoints: (build) => ({
        getTrackUrl: build.query<ITrackPlaybackSource, string>({
            query: (id: string) => ({
                url: `/tracks/${id}/url`,
                method: 'GET',
                params: { origin: window.location.origin }
            })
        }),
        addTrackToHistory: build.mutation<void, string>({
            query: (id: string) => ({ url: `/tracks/${id}/history`, method: 'POST', requiresAuth: true }),
            invalidatesTags: ['History']
        }),
        getSearchSuggestions: build.query<string[], string>({
            query: (query: string) => ({
                url: '/search/suggestions',
                method: 'GET',
                params: { q: query }
            })
        }),
        search: build.query<ISearchResponse | IArtistInfo[] | IPlaylistInfo[] | ITrackBase[] | IAlbumInfo[], ISearchRequest>({
            query: (request: ISearchRequest) => ({
                url: `/search${request.type ? `/${request.type}` : ''}`,
                method: 'GET',
                params: { q: request.query }
            })
        }),
        getRadio: build.query<ITrackBase[], string>({
            query: (id: string) => ({ url: `/radios/${id}`, method: 'GET' })
        }),
        getArtist: build.query<IArtist, string>({
            query: (id: string) => ({ url: `/artists/${id}`, method: 'GET' })
        }),
        getArtistTracks: build.query<IPlaylistPage, string>({
            query: (id: string) => ({ url: `/artists/${id}/tracks`, method: 'GET' })
        }),
        getArtistTracksContinuation: build.query<IPlaylistPage, IPlaylistContinuationRequest>({
            query: request => ({
                url: `/artists/${request.id}/tracks/continuation`,
                method: 'GET',
                params: { continuation: request.continuation }
            })
        }),
        getAlbum: build.query<IAlbum, string>({
            query: (id: string) => ({ url: `/albums/${id}`, method: 'GET' })
        }),
        getPlaylist: build.query<IPlaylist, IPlaylistRequest>({
            query: request => ({
                url: `/playlists/${request.id}`,
                method: 'GET',
                params: request.params ? { params: request.params } : undefined
            }),
            providesTags: (_result, _error, { id }) => [{ type: 'Playlist', id }],
            async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
                if (id !== 'LM' && id !== 'VLLM') return;
                try {
                    const { data } = await queryFulfilled;
                    data.tracks.forEach(track => knownTrackRatings.set(track.id, 'LIKE'));
                } catch {
                    // The playlist query exposes its own error state.
                }
            }
        }),
        getPlaylistContinuation: build.query<IPlaylistPage, IPlaylistContinuationRequest>({
            query: request => ({
                url: `/playlists/${request.id}/continuation`,
                method: 'GET',
                params: { continuation: request.continuation }
            }),
            async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
                if (id !== 'LM' && id !== 'VLLM') return;
                try {
                    const { data } = await queryFulfilled;
                    data.tracks.forEach(track => knownTrackRatings.set(track.id, 'LIKE'));
                } catch {
                    // The continuation query exposes its own error state.
                }
            }
        }),
        getHome: build.query<IHomeFeed, void>({
            query: () => ({ url: '/home', method: 'GET', requiresAuth: true }),
            providesTags: ['Home']
        }),
        getHomeContinuation: build.query<IHomeFeed, string>({
            query: cursor => ({
                url: '/home/continuation',
                method: 'GET',
                requiresAuth: true,
                params: { cursor }
            })
        }),
        getHomeSection: build.query<IHomeSectionPage, string>({
            query: cursor => ({ url: '/home/section', method: 'GET', requiresAuth: true, params: { cursor } })
        }),
        getTrackRating: build.query<ITrackRating, string>({
            async queryFn(id, _queryApi, _extraOptions, baseQuery) {
                const knownRating = knownTrackRatings.get(id);
                if (knownRating) return { data: { rating: knownRating } };
                const result = await baseQuery({
                    url: `/tracks/${id}/rating`, method: 'GET', requiresAuth: true
                });
                if (result.error) return { error: result.error };
                return { data: result.data as ITrackRating };
            },
            providesTags: (_result, _error, id) => [{ type: 'TrackRating', id }]
        }),
        setTrackRating: build.mutation<ITrackRating, { id: string; rating: TrackRating }>({
            query: ({ id, rating }) => ({
                url: `/tracks/${id}/rating`, method: 'PUT', data: { rating }, requiresAuth: true
            }),
            async onQueryStarted({ id, rating }, { dispatch, queryFulfilled }) {
                const previous = knownTrackRatings.get(id);
                knownTrackRatings.set(id, rating);
                const patch = dispatch(api.util.updateQueryData('getTrackRating', id, draft => {
                    draft.rating = rating;
                }));
                try {
                    await queryFulfilled;
                } catch {
                    if (previous) knownTrackRatings.set(id, previous);
                    else knownTrackRatings.delete(id);
                    patch.undo();
                }
            },
            invalidatesTags: (_result, _error, { id: _id }) => [
                { type: 'Playlist', id: 'LM' },
                { type: 'Playlist', id: 'VLLM' }
            ]
        }),
        getHistory: build.query<ITrackBase[], void>({
            query: () => ({ url: '/history', method: 'GET', requiresAuth: true }),
            providesTags: ['History']
        }),
        getYouTubeAuthStatus: build.query<AppAuthState, void>({
            query: () => ({ url: '/auth/status', method: 'GET' }),
            providesTags: ['Auth']
        }),
        signOutYouTube: build.mutation<void, void>({
            query: () => ({ url: '/auth/logout', method: 'POST' }),
            invalidatesTags: ['Auth', 'Home', 'History']
        }),
        getYouTubeMusicConnection: build.query<YouTubeMusicConnectionState, void>({
            query: () => ({ url: '/youtube-music', method: 'GET', requiresAuth: true }),
            providesTags: ['Auth']
        }),
        connectYouTubeMusic: build.mutation<YouTubeMusicConnectionState, YouTubeMusicConnectionInput>({
            query: data => ({ url: '/youtube-music', method: 'PUT', data, requiresAuth: true }),
            invalidatesTags: ['Auth', 'Home', 'History']
        }),
        disconnectYouTubeMusic: build.mutation<void, void>({
            query: () => ({ url: '/youtube-music', method: 'DELETE', requiresAuth: true }),
            invalidatesTags: ['Auth', 'Home', 'History']
        }),
    })
});

export const {
    useGetTrackUrlQuery,
    useAddTrackToHistoryMutation,
    useGetTrackRatingQuery,
    useSetTrackRatingMutation,
    useSearchQuery,
    useGetSearchSuggestionsQuery,
    useLazyGetRadioQuery,
    useGetArtistQuery,
    useGetArtistTracksQuery,
    useLazyGetArtistTracksContinuationQuery,
    useGetAlbumQuery,
    useGetPlaylistQuery,
    useLazyGetPlaylistContinuationQuery,
    useGetHomeQuery,
    useLazyGetHomeContinuationQuery,
    useLazyGetHomeSectionQuery,
    useGetHistoryQuery,
    useGetYouTubeAuthStatusQuery,
    useSignOutYouTubeMutation,
    useGetYouTubeMusicConnectionQuery,
    useConnectYouTubeMusicMutation,
    useDisconnectYouTubeMusicMutation,
} = api;

export default api;
