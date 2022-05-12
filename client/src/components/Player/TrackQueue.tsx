import React from 'react';
import { MenuProps } from '@mui/material/Menu/Menu';
import MenuItem from '@mui/material/MenuItem/MenuItem';
import { MenuWrapper } from "../Menu/MenuWrapper";
import { useAppSelector } from '../../store';
import { getTracks } from '../../store/player';
import { List } from '../List/List';
import { ITrackBase } from '../../../../shared';
import { Track } from "../Track/Track";
import styles from './TrackQueue.module.css';

function renderTrack(info: ITrackBase) {
    return (
        <MenuItem key={info.id}>
            <Track info={info}/>
        </MenuItem>
    )
}

export const TrackQueue: React.FC<MenuProps> = props => {
    const tracks = useAppSelector(getTracks);

    return (
        <MenuWrapper {...props} className={styles.container} id='track-queue'>
            {tracks?.length ? <List source={tracks} renderItem={renderTrack}/> : 'ОЧЕРЕДЬ ПУСТА'}
        </MenuWrapper>
    );
}