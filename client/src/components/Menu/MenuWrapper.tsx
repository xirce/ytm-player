import React, { MouseEventHandler } from 'react';
import { MenuProps } from "@mui/material/Menu/Menu";
import Menu from "@mui/material/Menu";

export const MenuWrapper: React.FC<MenuProps> = React.memo(({ onClick, onClose, ...rest }) => {
    const handleClick: MouseEventHandler<HTMLDivElement> = event => {
        onClick && onClick(event);
        onClose && onClose({}, 'backdropClick');
    }

    return (
        <Menu {...rest}
            onClick={handleClick}
            sx={{
                '& .MuiMenu-paper': {
                    backgroundColor: 'var(--bg-dark-color)',
                    color: 'var(--text-light-color)',
                },
                '& .MuiMenuItem-root': {
                    color: 'var(--text-light-color)',
                    '&:hover': {
                        backgroundColor: 'var(--bg-main-color)',
                    }
                },
                '& .MuiListItemIcon-root': {
                    color: 'var(--text-main-color)'
                }
            }}
        >
            {rest.children}
        </Menu>
    );
});