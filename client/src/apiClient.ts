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
    YouTubeAuthState
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
        if (requiresAuth && (err.response?.status === 401 || err.response?.status === 503)) {
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

const api = createApi({
    reducerPath: 'api',
    baseQuery: axiosBaseQuery({ baseUrl: '/api' }),
    keepUnusedDataFor: 30,
    tagTypes: ['Home', 'History', 'Auth'],
    endpoints: (build) => ({
        getTrackUrl: build.query<string, string>({
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
            })
        }),
        getPlaylistContinuation: build.query<IPlaylistPage, IPlaylistContinuationRequest>({
            query: request => ({
                url: `/playlists/${request.id}/continuation`,
                method: 'GET',
                params: { continuation: request.continuation }
            })
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
        getHistory: build.query<ITrackBase[], void>({
            query: () => ({ url: '/history', method: 'GET', requiresAuth: true }),
            providesTags: ['History']
        }),
        getYouTubeAuthStatus: build.query<YouTubeAuthState, void>({
            query: () => ({ url: '/auth/status', method: 'GET' }),
            providesTags: ['Auth']
        }),
        startYouTubeAuthentication: build.mutation<YouTubeAuthState, void>({
            query: () => ({ url: '/auth/device', method: 'POST' }),
            invalidatesTags: ['Home']
        }),
        signOutYouTube: build.mutation<void, void>({
            query: () => ({ url: '/auth/session', method: 'DELETE' }),
            invalidatesTags: ['Home']
        }),
    })
});

export const {
    useGetTrackUrlQuery,
    useAddTrackToHistoryMutation,
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
    useStartYouTubeAuthenticationMutation,
    useSignOutYouTubeMutation,
} = api;

export default api;
