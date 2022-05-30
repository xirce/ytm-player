import React, { MouseEventHandler, useMemo, useState } from 'react';
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import { MenuWrapper } from '../Menu/MenuWrapper';
import styles from '../../Common.module.css';

export const ActionsControl: React.FC = React.memo((props) => {
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
            <button className={styles.iconBtn} onClick={handleOpenMenu}>
                <MoreVertRounded />
            </button>
            <MenuWrapper
                anchorOrigin={{
                    horizontal: 'right',
                    vertical: 'bottom'
                }}
                anchorEl={anchorElement}
                open={isMenuOpen}
                onClose={handleCloseMenu}
            >
                {props.children}
            </MenuWrapper>
        </>

    );
});