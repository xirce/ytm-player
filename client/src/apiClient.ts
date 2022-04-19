import axios from 'axios';
import { ITrackBase } from '../../shared';

const apiClient = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: {
        "Content-type": "application/json"
    }
});

export async function getSearchSuggestions(query: string) {
    return await apiClient.get<string[]>(`/getSearchSuggestions?q=${query}`);
}

export async function search(query: string) {
    return await apiClient.get<ITrackBase[]>(`/search?q=${query}`);
}

export async function searchAll(query: string) {
    return await apiClient.get<any[]>(`/searchAll?q=${query}`);
}

export async function getTrackUrl(id: string) {
    return await apiClient.get(`/getTrackUrl/${id}`);
}

export async function getPlaylist(id: string) {
    return await apiClient.get(`/getPlaylist/${id}`);
}
export default apiClient;