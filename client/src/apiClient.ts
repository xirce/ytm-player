import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { BaseQueryFn } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/dist/query/react";
import { IAlbum, IArtist, IPlaylist, ISearchResponse } from "../../shared";

export const axiosBaseQuery = ({ baseUrl }: { baseUrl: string } = { baseUrl: '' }): BaseQueryFn<{
    url: string
    method: AxiosRequestConfig['method']
    data?: AxiosRequestConfig['data']
    params?: AxiosRequestConfig['params']
}> => async ({ url, method, data, params }) => {
    try {
        const result = await axios.request({ url: baseUrl + url, method, data, params })
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

const api = createApi({
    reducerPath: 'api',
    baseQuery: axiosBaseQuery({ baseUrl: 'http://localhost:3001/api' }),
    keepUnusedDataFor: 30,
    endpoints: (build) => ({
        getTrackUrl: build.query<string, string>({
            query: (id: string) => ({ url: `/track_urls/${id}`, method: 'GET' })
        }),
        getSearchSuggestions: build.query<string[], string>({
            query: (query: string) => ({ url: `/search?q=${query}/suggestions`, method: 'GET' })
        }),
        search: build.query<ISearchResponse, string>({
            query: (query: string) => ({ url: `/search?q=${query}`, method: 'GET' })
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
})

export const { useSearchQuery, useGetTrackUrlQuery, useGetPlaylistQuery, useGetAlbumQuery, useGetArtistQuery } = api;

export default api;
