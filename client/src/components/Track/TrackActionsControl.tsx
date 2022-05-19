import React, { MouseEventHandler, useMemo, useState } from 'react';
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import { TrackActions } from "./TrackActions";
import { ITrackBase } from "../../../../shared";
import styles from "./Track.module.css";

export interface ITrackActionsControlProps {
    info: ITrackBase;
}

export const TrackActionsControl: React.FC<ITrackActionsControlProps> = ({ info }) => {
    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

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
        <>
            <button className={styles.actionsBtn} onClick={handleOpenMenu}>
                <MoreVertRounded/>
            </button>
            <TrackActions
                info={info}
                anchorOrigin={{
                    horizontal: 'right',
                    vertical: 'bottom'
                }}
                anchorEl={anchorElement}
                open={isMenuOpen}
                onClose={handleCloseMenu}
            />
        </>

    );
};