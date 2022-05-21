import React from 'react';
import { ListItemIcon, MenuItem } from "@mui/material";
import { MenuProps } from "@mui/material/Menu/Menu";
import { PlaylistPlayRounded } from "@mui/icons-material";
import { MenuWrapper } from "../Menu/MenuWrapper";
import { ITrackBase } from "../../../../shared";
import { useAppAction } from "../../store";

export interface ITrackActionsProps {
    info: ITrackBase;
}

export const TrackActions: React.FC<MenuProps & ITrackActionsProps> = (props) => {
    const { appendTracks } = useAppAction();

    const handleAddToQueue = () => {
        appendTracks([props.info]);
    }

    return (
        <MenuWrapper
            {...props}
            id={`track-menu-${props.info.id}`}
        >
            <MenuItem onClick={() => {
                handleAddToQueue();
                props.onClose && props.onClose({}, 'backdropClick')
            }}>
                <ListItemIcon>
                    <PlaylistPlayRounded fontSize='small' />
                </ListItemIcon>
                Добавить в очередь
            </MenuItem>
        </MenuWrapper>
    );
};