import React from 'react';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import {
    ErrorOutlineRounded,
    PauseRounded,
    PlayArrowRounded,
    PlaylistPlayRounded,
    QueueMusicRounded,
    VolumeUpRounded
} from '@mui/icons-material';
import { ArtistLink } from '../ArtistLink/ArtistLink';
import { AlbumLink } from '../AlbumLink/AlbumLink';
import { ActionsControl } from '../Actions/ActionsControl';
import { PlayRadioAction } from '../Actions/PlayRadioAction';
import { formatPlayCount, formatSeconds, formatShortPlayCount } from '../../utils/formatting';
import { ITrackBase } from '../../../../shared';
import { useAppAction, useAppSelector } from "../../store";
import { getDisplayedTrack, getIsPlaying } from '../../store/player';
import styles from "./Track.module.css";

export interface ITrackProps {
    source: ITrackBase[];
    index: number;
    isCurrent?: boolean;
    isPlaying?: boolean;
    showPlayCount?: boolean;
    showDuration?: boolean;
    compactPlayCount?: boolean;
    mobileCard?: boolean;
}

export const Track: React.FC<ITrackProps> = React.memo(({
    source, index, isPlaying, isCurrent, showPlayCount = false, showDuration = true,
    compactPlayCount = false, mobileCard = false, children
}) => {
    const { setTracks, setTrackIndex, setIsPlaying, appendLeftTracks, appendTracks, updateTrackMetadata } = useAppAction();
    const info = source[index];
    const displayedTrack = useAppSelector(getDisplayedTrack);
    const playerIsPlaying = useAppSelector(getIsPlaying);
    const resolvedIsCurrent = isCurrent ?? displayedTrack?.id === info.id;
    const resolvedIsPlaying = resolvedIsCurrent && (isPlaying ?? playerIsPlaying);
    const imageUrl = mobileCard
        ? info.imageUrls?.medium ?? info.imageUrl
        : info.imageUrls?.small ?? info.imageUrl;

    const togglePlay = async () => {
        if (resolvedIsCurrent) {
            updateTrackMetadata(info);
            setIsPlaying(!resolvedIsPlaying);
        } else {
            setTracks(source);
            setTrackIndex(index);
            setIsPlaying(true);
        }
    }
    const handlePlayNext = () => appendLeftTracks([info]);

    const handleEnqueue = () => appendTracks([info]);

    return (
        <div className={`${resolvedIsCurrent ? styles.playingContainer : styles.container} ${!showDuration ? styles.withoutDuration : ''} ${mobileCard ? styles.mobileCard : ''}`}>
            <div className={styles.imageContainer} onClick={() => info.id && togglePlay()}>
                <img className={styles.image} src={imageUrl} alt={info.title} referrerPolicy="no-referrer" />
                {resolvedIsPlaying && <VolumeUpRounded className={styles.nowPlayingIcon} fontSize='large' />}
                {info.id
                    ? resolvedIsPlaying
                        ? <PauseRounded className={styles.playBtn} fontSize='large' />
                        : <PlayArrowRounded
                            className={`${styles.playBtn} ${resolvedIsCurrent ? styles.pausedCurrentIcon : ''}`}
                            fontSize='large'
                        />
                    : <ErrorOutlineRounded className={styles.playBtn} fontSize='large' />}
            </div>
            <div className={styles.title}>
                <span className={styles.trackTitle}>
                    {info.album?.id
                        ? <AlbumLink info={info.album}>{info.title}</AlbumLink>
                        : info.title}
                </span>
            </div>
            <span className={styles.artist}>
                <span className={styles.artistName}>
                    {info.artist?.id
                        ? <ArtistLink info={info.artist} />
                        : info.artist?.name ?? ''}
                </span>
            </span>
            {showPlayCount && info.playCount != null && (
                <span className={styles.playCount} title={formatPlayCount(info.playCount)}>
                    {compactPlayCount
                        ? formatShortPlayCount(info.playCount)
                        : formatPlayCount(info.playCount)}
                </span>
            )}
            {showDuration && info.duration != null && (
                <span className={styles.duration}>
                    {formatSeconds(info.duration)}
                </span>
            )}
            <div className={styles.actionsBtn}>
                <ActionsControl>
                    <PlayRadioAction source={info} />
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
                    {children}
                </ActionsControl>
            </div>
        </div>
    );
});
