import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: {
        "Content-type": "application/json"
    }
});

export async function getSearchSuggestions(query: string) {
    return await apiClient.get<string[]>(`/search_suggestions?q=${query}`);
}

export async function search(query: string) {
    return await apiClient.get<any[]>(`/search?q=${query}`);
}

export async function getTrackUrl(id: string) {
    return await apiClient.get<string>(`/track_url/${id}`);
}

export async function getPlaylist(id: string) {
    return await apiClient.get(`/playlist/${id}`);
}

export async function getAlbum(id: string) {
    return await apiClient.get(`/album/${id}`);
}

export async function getArtist(id: string) {
    return await apiClient.get(`/artist/${id}`);
}

export default apiClient;