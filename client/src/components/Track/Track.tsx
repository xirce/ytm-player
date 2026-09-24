import React from 'react';
import { ListItemIcon, ListItemText, MenuItem, useMediaQuery } from '@mui/material';
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
import { useTouchPress } from '../../hooks/useTouchPress';
import { useLazyGetRadioQuery } from '../../apiClient';
import { buildRadioQueue } from '../../utils/buildRadioQueue';
import styles from "./Track.module.css";

let latestPlaybackRequest = 0;

export interface ITrackProps {
    source: ITrackBase[];
    index: number;
    isCurrent?: boolean;
    isPlaying?: boolean;
    showPlayCount?: boolean;
    showDuration?: boolean;
    compactPlayCount?: boolean;
    mobileCard?: boolean;
    playOnRowClick?: boolean;
    mobileDragHandle?: boolean;
    playWithRadioQueue?: boolean;
}

export const Track: React.FC<ITrackProps> = React.memo(({
    source, index, isPlaying, isCurrent, showPlayCount = false, showDuration = true,
    compactPlayCount = false, mobileCard = false, playOnRowClick = false,
    mobileDragHandle = false, playWithRadioQueue = false, children
}) => {
    const { setTracks, setTrackIndex, setIsPlaying, setPlayerExpanded, appendLeftTracks, appendTracks, updateTrackMetadata } = useAppAction();
    const [getRadio] = useLazyGetRadioQuery();
    const isMobile = useMediaQuery('(max-width:700px)');
    const { pressed, touchHandlers } = useTouchPress();
    const info = source[index];
    const displayedTrack = useAppSelector(getDisplayedTrack);
    const playerIsPlaying = useAppSelector(getIsPlaying);
    const resolvedIsCurrent = isCurrent ?? displayedTrack?.id === info.id;
    const resolvedIsPlaying = resolvedIsCurrent && (isPlaying ?? playerIsPlaying);
    const imageUrl = mobileCard
        ? info.imageUrls?.medium ?? info.imageUrl
        : info.imageUrls?.small ?? info.imageUrl;

    const playTrack = (toggle = true) => {
        if (!info.id) return;
        const shouldPlay = !toggle || !resolvedIsPlaying;
        if (resolvedIsCurrent) {
            updateTrackMetadata(info);
            setIsPlaying(shouldPlay);
        } else {
            const requestId = ++latestPlaybackRequest;
            setTracks(playWithRadioQueue ? [info] : source);
            setTrackIndex(playWithRadioQueue ? 0 : index);
            setIsPlaying(true);
            if (playWithRadioQueue) {
                void getRadio(info.radioId).unwrap().then(tracks => {
                    if (requestId !== latestPlaybackRequest) return;
                    const queue = buildRadioQueue(info, tracks);
                    setTracks(queue.tracks);
                    setTrackIndex(queue.trackIndex);
                }).catch(() => undefined);
            }
        }
        if (isMobile && shouldPlay) setPlayerExpanded(true);
    }
    const handlePlayNext = () => appendLeftTracks([info]);

    const handleEnqueue = () => appendTracks([info]);

    const handleRowClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isMobile && !playOnRowClick) return;
        if (!event.currentTarget.contains(event.target as Node)) return;
        const target = event.target;
        if (target instanceof Element && target.closest('a, button, [data-drag-handle]')) return;
        playTrack(!isMobile);
    };

    return (
        <div
            className={`${resolvedIsCurrent ? styles.playingContainer : styles.container} ${pressed ? styles.touchPressed : ''} ${!showDuration ? styles.withoutDuration : ''} ${mobileCard ? styles.mobileCard : ''} ${mobileDragHandle ? styles.mobileDragHandle : ''}`}
            onClick={handleRowClick}
            {...touchHandlers}
        >
            <div className={styles.imageContainer} onClick={event => {
                event.stopPropagation();
                playTrack();
            }}>
                <img className={styles.image} src={imageUrl} alt={info.title} loading={mobileCard ? 'lazy' : undefined} referrerPolicy="no-referrer" />
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
                    {!isMobile && info.album?.id
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
