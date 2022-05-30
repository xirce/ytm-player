import React from 'react';
import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { MenuProps } from "@mui/material/Menu/Menu";
import { PlaylistPlayRounded, QueueMusicRounded, RadioRounded } from "@mui/icons-material";
import { MenuWrapper } from "../Menu/MenuWrapper";
import { ITrackBase } from "../../../../shared";
import { useAppAction } from "../../store";
import { ToRadioAction } from '../Actions/ToRadioAction';

export interface ITrackActionsProps {
    info: ITrackBase;
}

export const TrackActions: React.FC<MenuProps & ITrackActionsProps> = ({ info, ...rest }) => {

    return (
        <MenuWrapper
            {...rest}
            id={`track-menu-${info.id}`}
        >
            
        </MenuWrapper>
    );
};