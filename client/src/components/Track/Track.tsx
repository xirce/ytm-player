import React from 'react';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import { PauseRounded, PlayArrowRounded, PlaylistPlayRounded, QueueMusicRounded } from '@mui/icons-material';
import { ArtistLink } from '../ArtistLink/ArtistLink';
import { ActionsControl } from '../Actions/ActionsControl';
import { ToRadioAction } from '../Actions/ToRadioAction';
import { formatSeconds } from '../../utils/formatting';
import { ITrackBase } from '../../../../shared';
import { useAppAction, } from "../../store";
import styles from "./Track.module.css";

export interface ITrackProps {
    source: ITrackBase[];
    index: number;
    isCurrent?: boolean;
    isPlaying?: boolean;
}

export const Track: React.FC<ITrackProps> = React.memo(({ source, index, isPlaying, isCurrent }) => {
    const { setTracks, setTrackIndex, setIsPlaying, appendLeftTracks, appendTracks } = useAppAction();
    const info = source[index];

    const togglePlay = async () => {
        if (isCurrent) {
            setIsPlaying(!isPlaying);
        } else {
            setTracks(source);
            setTrackIndex(index);
            setIsPlaying(true);
        }
    }
    const handlePlayNext = () => appendLeftTracks([info]);

    const handleEnqueue = () => appendTracks([info]);

    return (
        <div className={isCurrent ? styles.playingContainer : styles.container}>
            <div className={styles.imageContainer} onClick={togglePlay}>
                <img className={styles.image} src={info.imageUrl} />
                {isPlaying
                    ? <PauseRounded className={styles.playBtn} fontSize='large' />
                    : <PlayArrowRounded className={styles.playBtn} fontSize='large' />}
            </div>
            <div className={styles.title}>{info.title}</div>
            {info.artist &&
                <span className={styles.artist}><ArtistLink info={info.artist} /></span>}
            {info.duration && <span className={styles.duration}>{formatSeconds(info.duration)}</span>}
            <ActionsControl>
                <MenuItem onClick={handlePlayNext}>
                    <ListItemIcon>
                        <PlaylistPlayRounded fontSize='small' />
                    </ListItemIcon>
                    <ListItemText>
                        Включить следующим
                    </ListItemText>
                </MenuItem>
                <MenuItem onClick={handleEnqueue}>
                    <ListItemIcon>
                        <QueueMusicRounded fontSize='small' />
                    </ListItemIcon>
                    <ListItemText>
                        Добавить в очередь
                    </ListItemText>
                </MenuItem>
                <ToRadioAction source={info} />
            </ActionsControl>
        </div>
    );
});