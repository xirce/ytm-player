import React, { MouseEventHandler } from 'react';
import { MenuItem, MenuItemProps } from '@mui/material';

export interface IMenuItemWrapperProps {
    afterClick?: () => void;
}

export const MenuItemWrapper: React.FC<MenuItemProps & IMenuItemWrapperProps> = React.memo((props) => {
    const handleClick: MouseEventHandler<HTMLLIElement> = event => {
        props.onClick && props.onClick(event);
        props.afterClick && props.afterClick();
    };

    return (
        <MenuItem {...props} onClick={handleClick}>
            {props.children}
        </MenuItem>
    );
})