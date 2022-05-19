import React from 'react';
import { MenuProps } from "@mui/material/Menu/Menu";
import Menu from "@mui/material/Menu";

export const MenuWrapper: React.FC<MenuProps> = React.memo(props => {
    return (
        <Menu {...props}
              sx={{
                  '& .MuiMenu-paper': {
                      backgroundColor: 'var(--bg-dark-color)',
                      color: 'var(--text-light-color)',
                  },
                  '& .MuiMenuItem-root:hover': {
                      backgroundColor: 'var(--bg-main-color)'
                  },
                  '& .MuiListItemIcon-root': {
                      color: 'var(--text-main-color)'
                  }
              }}
        >
            {props.children}
        </Menu>
    );
});