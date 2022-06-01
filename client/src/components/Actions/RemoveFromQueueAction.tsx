import React from 'react';
import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { DeleteRounded } from "@mui/icons-material";
import { useAppAction } from "../../store";

export interface IRemoveFromQueueActionProps {
    index: number;
}

export const RemoveFromQueueAction: React.FC<IRemoveFromQueueActionProps> = React.memo(({ index }) => {
    const { removeTrack } = useAppAction();

    return (
        <MenuItem onClick={() => removeTrack(index)}>
            <ListItemIcon>
                <DeleteRounded fontSize='small' />
            </ListItemIcon>
            <ListItemText>
                Удалить из очереди
            </ListItemText>
        </MenuItem>
    );
});