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
    IAlbumInfo
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
    endpoints: (build) => ({
        getTrackUrl: build.query<string, string>({
            query: (id: string) => ({ url: `/tracks/${id}/url`, method: 'GET' })
        }),
        getSearchSuggestions: build.query<string[], string>({
            query: (query: string) => ({ url: `/search/suggestions?q=${query}`, method: 'GET' })
        }),
        search: build.query<ISearchResponse | IArtistInfo[] | IPlaylistInfo[] | ITrackBase[] | IAlbumInfo[], ISearchRequest>({
            query: (request: ISearchRequest) => ({
                url: `/search${request.type ? `/${request.type}` : ''}?q=${request.query}`,
                method: 'GET'
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
} = api;

export default api;
