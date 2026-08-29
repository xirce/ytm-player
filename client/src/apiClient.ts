import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { BaseQueryFn } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/dist/query/react";
import {
    IAlbum,
    IArtist,
    IPlaylist,
    ISearchResponse,
    IArtistInfo,
    IPlaylistInfo,
    ITrackBase,
    IAlbumInfo,
    IHomeFeed,
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
}> => async ({ url, method, data, params }) => {
    try {
        const result = await instance.request({ url: baseUrl + url, method, data, params })
        return { data: result.data }
    } catch (axiosError) {
        let err = axiosError as AxiosError
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

const api = createApi({
    reducerPath: 'api',
    baseQuery: axiosBaseQuery({ baseUrl: 'http://localhost:3001/api' }),
    keepUnusedDataFor: 30,
    tagTypes: ['Home'],
    endpoints: (build) => ({
        getTrackUrl: build.query<string, string>({
            query: (id: string) => ({ url: `/tracks/${id}/url`, method: 'GET' })
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
        getAlbum: build.query<IAlbum, string>({
            query: (id: string) => ({ url: `/albums/${id}`, method: 'GET' })
        }),
        getPlaylist: build.query<IPlaylist, string>({
            query: (id: string) => ({ url: `/playlists/${id}`, method: 'GET' })
        }),
        getHome: build.query<IHomeFeed, void>({
            query: () => ({ url: '/home', method: 'GET' }),
            providesTags: ['Home']
        }),
        getYouTubeAuthStatus: build.query<YouTubeAuthState, void>({
            query: () => ({ url: '/auth/status', method: 'GET' })
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
    useSearchQuery,
    useGetSearchSuggestionsQuery,
    useLazyGetRadioQuery,
    useGetArtistQuery,
    useGetAlbumQuery,
    useGetPlaylistQuery,
    useGetHomeQuery,
    useGetYouTubeAuthStatusQuery,
    useStartYouTubeAuthenticationMutation,
    useSignOutYouTubeMutation,
} = api;

export default api;
