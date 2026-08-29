import React from "react";
import { useParams } from "react-router-dom";
import { useGetArtistQuery, useGetArtistTracksQuery } from '../../apiClient';
import { TrackList } from '../../components/TrackList/TrackList';
import { PlaylistItem } from "../../components/PlaylistItem/PlaylistItem";
import { ArtistHeader } from "../../components/ArtistHeader/ArtistHeader";
import styles from './Artist.module.css';
import { Link } from 'react-router-dom';

export const ArtistPage: React.FC = () => {
    const { id } = useParams();
    const { isLoading, data } = useGetArtistQuery(id as string);
    const allTracks = useGetArtistTracksQuery(id as string);

    if (isLoading) {
        return <h1 style={{ color: 'white' }}>ЗАГРУЖАЮ...</h1>
    }

    if (!data) {
        return <h1>Что-то пошло не так</h1>
    }

    const to = `/artist/${id}/tracks`;
    const topSongs = allTracks.data?.tracks.slice(0, 5) ?? data.topSongs ?? data.tracks;

    return (
        <>
            <ArtistHeader info={data.info} />
            <div className={styles.tracks}>
                <TrackList title='Треки' source={topSongs} />
                <div>
                    <Link to={to}>Показать всё</Link>
                </div>
            </div>
            <h2>Альбомы</h2>
            <div className={styles.albums}>
                {data.albums.map(album => (
                    <PlaylistItem info={album} key={album.id} />
                ))}
            </div>
            {data.singles.length > 0 && (
                <>
                    <h2>Синглы и EP</h2>
                    <div className={styles.albums}>
                        {data.singles.map(single => (
                            <PlaylistItem info={single} key={single.id} />
                        ))}
                    </div>
                </>
            )}
        </>
    );
}
