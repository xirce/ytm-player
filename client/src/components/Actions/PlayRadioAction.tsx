import React from 'react';
import { RadioRounded } from '@mui/icons-material';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import { useLazyGetRadioQuery } from '../../apiClient';
import { useAppAction } from '../../store';
import { IHaveRadio } from '../../../../shared';

export interface IToRadioActionProps {
    source: IHaveRadio;
}

export const PlayRadioAction: React.FC<IToRadioActionProps> = React.memo(({ source }) => {
    const { setTracks, setTrackIndex } = useAppAction();
    const [getRadio] = useLazyGetRadioQuery();

    const handleClick = async () => {
        try {
            const data = await getRadio(source.radioId).unwrap();
            setTracks(data);
            setTrackIndex(0);
        } catch (error) {
            console.log(error);
        }
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