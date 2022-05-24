import React from 'react';
import { Link } from "react-router-dom";
import { PauseRounded, PlayArrowRounded } from '@mui/icons-material';
import { ITrackBase } from '../../../../shared';
import { formatSeconds } from '../../utils/formatting';
import { TrackActionsControl } from "./TrackActionsControl";
import { useAppAction, } from "../../store";
import styles from "./Track.module.css";

export interface ITrackProps {
    source: ITrackBase[];
    index: number;
    isPlaying?: boolean;
}

export const Track: React.FC<ITrackProps> = React.memo(({ source, index, isPlaying }) => {
    const { setTracks, setTrackIndex, setIsPlaying } = useAppAction();
    const info = source[index];

    const togglePlay = async () => {
        if (isPlaying) {
            setIsPlaying(false);
        } else {
            setTracks(source);
            setTrackIndex(index);
        }
    }

    return (
        <div className={isPlaying ? styles.playingContainer : styles.container}>
            <div className={styles.imageContainer} onClick={togglePlay}>
                <img className={styles.image} src={info.imageUrl} />
                {isPlaying
                    ? <PauseRounded className={styles.playBtn} fontSize='large' />
                    : <PlayArrowRounded className={styles.playBtn} fontSize='large' />}
            </div>
            <div className={styles.title}>{info.title}</div>
            {info.artist &&
            <span className={styles.artist}><Link to={`/artist/${info.artist.id}`}>{info.artist.name}</Link></span>}
            {info.duration && <span className={styles.duration}>{formatSeconds(info.duration)}</span>}
            <TrackActionsControl info={info} />
        </div>
    );
});