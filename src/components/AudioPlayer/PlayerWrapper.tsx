import Box from '@mui/material/Box';
import React from 'react';
import {AudioPlayer} from './Player';

export const PlayerWrapper: React.FC = () => {
    return (
        <Box sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0
        }}>
            <AudioPlayer/>
        </Box>
    );
}