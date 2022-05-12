import React, { MouseEventHandler, useMemo, useState } from 'react';
import MenuItem from "@mui/material/MenuItem/MenuItem";
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import { PlayArrowRounded, PlaylistPlayRounded } from '@mui/icons-material';
import { ListItemIcon } from "@mui/material";
import { Link } from "react-router-dom";
import { ITrackBase } from '../../../../shared';
import { useAppAction } from "../../store";
import { formatSeconds } from '../../utils/formatting';
import { MenuWrapper } from "../Menu/MenuWrapper";
import styles from "./Track.module.css";

export interface ITrackProps {
    info: ITrackBase;
}

export const Track: React.FC<ITrackProps> = ({ info }) => {
    const [isPlaying, setIsPlaying] = useState();
    const { appendLeftTracks, appendTracks } = useAppAction();
    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

    const handlePlay = async () => {
        appendLeftTracks([info]);
    }

    const handleAddToQueue = async () => {
        appendTracks([info]);
    }

    const isMenuOpen = useMemo(() => {
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
                <img className={styles.image} src={info.imageUrl}/>
                <PlayArrowRounded className={styles.playBtn} fontSize='large'/>
            </div>
            <div className={styles.title}>{info.title}</div>
            <Link to='#'><span className={styles.artist}>{info.artist}</span></Link>
            <span className={styles.duration}>{formatSeconds(info.duration)}</span>
            <button className={styles.menuBtn} onClick={handleOpenMenu}>
                <MoreVertRounded/>
            </button>
            <MenuWrapper
                id={`track-menu-${info.id}`}
                anchorOrigin={{
                    horizontal: 'right',
                    vertical: 'bottom'
                }}
                anchorEl={anchorElement}
                open={isMenuOpen}
                onClose={handleCloseMenu}
            >
                <MenuItem onClick={handleAddToQueue}>
                    <ListItemIcon>
                        <PlaylistPlayRounded fontSize='small'/>
                    </ListItemIcon>
                    Добавить в очередь
                </MenuItem>
            </MenuWrapper>
        </div>
    );
}