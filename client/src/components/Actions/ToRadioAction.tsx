import React from 'react';
import { Link } from 'react-router-dom';
import { RadioRounded } from '@mui/icons-material';
import { ListItemIcon, ListItemText, MenuItem } from '@mui/material';
import { IHaveRadio } from '../../../../shared';

export interface IToRadioActionProps {
    source: IHaveRadio;
}

export const ToRadioAction: React.FC<IToRadioActionProps> = React.memo(({ source }) => {
    return (
        <Link to={`/radio/${source.radioId}`}>
            <MenuItem>
                <ListItemIcon>
                    <RadioRounded fontSize='small' />
                </ListItemIcon>
                <ListItemText>
                    Перейти к радиостанции
                </ListItemText>
            </MenuItem>
        </Link>
    );
});