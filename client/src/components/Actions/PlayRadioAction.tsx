import React from 'react';
import { RadioRounded } from '@mui/icons-material';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import { getRadio } from '../../apiClient';
import { useAppAction } from '../../store';
import { IHaveRadio } from '../../../../shared';

export interface IToRadioActionProps {
    source: IHaveRadio;
}

export const PlayRadioAction: React.FC<IToRadioActionProps> = React.memo(({ source }) => {
    const { setTracks, setTrackIndex } = useAppAction();

    const handleClick = async () => {
        const { data: tracks } = await getRadio(source.radioId);
        setTracks(tracks);
        setTrackIndex(0);
    }

    return (
        <MenuItem onClick={handleClick}>
            <ListItemIcon>
                <RadioRounded fontSize='small' />
            </ListItemIcon>
            <ListItemText>
                Включить радиостанцию
            </ListItemText>
        </MenuItem>
    );
});