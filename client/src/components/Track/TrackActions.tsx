import React from 'react';
import MenuItem from "@mui/material/MenuItem/MenuItem";
import { ListItemIcon } from "@mui/material";
import { PlaylistPlayRounded } from "@mui/icons-material";
import { MenuWrapper } from "../Menu/MenuWrapper";
import { ITrackBase } from "../../../../shared";
import { MenuProps } from "@mui/material/Menu/Menu";
import { useAppAction } from "../../store";

export interface ITrackActionsProps {
    info: ITrackBase;
}

export const TrackActions: React.FC<MenuProps & ITrackActionsProps> = (props) => {
    const { appendTracks } = useAppAction();

    const handleAddToQueue = async () => {
        appendTracks([props.info]);
    }

    return (
        <MenuWrapper
            {...props}
            id={`track-menu-${props.info.id}`}

        >
            <MenuItem onClick={handleAddToQueue}>
                <ListItemIcon>
                    <PlaylistPlayRounded fontSize='small'/>
                </ListItemIcon>
                Добавить в очередь
            </MenuItem>
        </MenuWrapper>
    );
};