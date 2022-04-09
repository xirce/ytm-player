import React, {MouseEventHandler, useMemo, useRef, useState} from 'react';
import styles from "./Track.module.css";
import {ITrack, ITrackBase} from '../../../../shared';
import {formatSeconds} from '../../utils/formatting';
import {usePlayerContext} from '../../context/PlayerContext/PlayerContext';
import {getTrackUrl} from '../../apiClient';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import {PlayArrowRounded, PlaylistPlayRounded} from '@mui/icons-material';
import {Link} from "react-router-dom";

export interface ITrackProps {
    info: ITrackBase;
}

async function convertToTrack(info: ITrackBase) {
    const {data} = await getTrackUrl(info.id);
    const track = info as ITrack;
    track.url = data;
    return track;
}


export const Track: React.FC<ITrackProps> = ({info}) => {
    const {appendTracks, appendLeftTracks} = usePlayerContext();
    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

    const handlePlay = async () => {
        const track = await convertToTrack(info);
        appendLeftTracks(track);
    }

    const handleAddToQueue = async () => {
        const track = await convertToTrack(info);
        appendTracks(track);
    }

    const menuIsOpen = useMemo(() => {
        return Boolean(anchorElement);
    }, [anchorElement]);

    const handleOpenMenu: MouseEventHandler = (event) => {
        setAnchorElement(event.target as HTMLElement);
    }

    const handleCloseMenu = () => {
        setAnchorElement(null);
    }

    return (
        <div className={styles.container}>
            <div className={styles.imageContainer} onClick={handlePlay}>
                <img src={info.imageUrl}/>
                <PlayArrowRounded className={styles.playBtn} fontSize='large'/>
            </div>
            <span className={styles.title}>{info.title}</span>
            <Link to='/'><span className={styles.artist}>{info.artist}</span></Link>
            <Link to='/'><span className={styles.duration}>{formatSeconds(info.duration)}</span></Link>
            <button className={styles.menuBtn} onClick={handleOpenMenu}>
                <MoreVertRounded/>
            </button>
            <Menu
                id={`trackMenu-${info.id}`}
                anchorEl={anchorElement}
                open={menuIsOpen}
                onClose={handleCloseMenu}
            >
                <MenuItem onClick={handleAddToQueue}><PlaylistPlayRounded fontSize='small'/></MenuItem>
            </Menu>
        </div>
    );
}