import React, { MouseEventHandler, useMemo, useState } from 'react';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import cx from 'classnames';
import styles from './PlayerControls.module.css';
import { TrackQueue } from './TrackQueue';

export const TrackQueueControl: React.FC = () => {
    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

    const isQueueOpen = useMemo(() => {
        return Boolean(anchorElement);
    }, [anchorElement]);

    const handleOpenQueue: MouseEventHandler = (event) => {
        setAnchorElement(event.target as HTMLElement);
    }

    const handleCloseQueue = () => {
        setAnchorElement(null);
    }

    return (
        <>
            <button className={cx(styles.btn, styles.iconBtn)} onClick={handleOpenQueue}>
                <QueueMusicRoundedIcon />
            </button>
            <TrackQueue anchorEl={anchorElement} open={isQueueOpen} onClose={handleCloseQueue} />
        </>

    );
}