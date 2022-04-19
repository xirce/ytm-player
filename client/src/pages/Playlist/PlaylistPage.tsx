import React from "react";
import { useParams } from 'react-router-dom';
import Box from "@mui/material/Box";
import { IPlaylistProps, getLabel } from '../../components/SearchResult/Playlist';
import { Track } from "../../components/Track/Track";
import { getPlaylist } from '../../apiClient';
import { IPlaylist } from '../../../../shared';
import { useQuery } from "react-query";

async function getPlaylistInfo(id: string) {
    const response = await getPlaylist(id);
    return response.data;
}

export const PlaylistPage: React.FC = () => {
    const { id } = useParams();
    const { isLoading, data } = useQuery(['playlist', id], async () => await getPlaylistInfo(id as string));
    if (isLoading) {
        return <h1 style={{ color: 'white' }}>ЗАГРУЖАЮ...</h1>
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', color: 'white', flexWrap: 'wrap', gap: '20px' }}>
                <Box sx={{
                    width: 192,
                    height: 192,
                    backgroundColor: 'white'
                }}>
                    <img src={data.thumbnails[0].url} style={{width: '192px', height: '192px'}}/>
                </Box>
                <div className="description">
                    <h2>{data.name}</h2>
                    <p>{data.videoCount} {getLabel(data.videoCount)}</p>
                </div>
            </div>
            <div className="tracks">
                <h2 style={{ color: 'white' }}>Список треков</h2>
            </div>
        </div>
    );
}