import { VolumeOffRounded, VolumeUpRounded } from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { SliderProps } from '@mui/material/Slider';
import React, { useState } from 'react';
import { SliderWrapper } from '../Slider/SliderWrapper';
import { TransparentButton } from './PlayerButton';

export const VolumeControls: React.FC<SliderProps> = ({onChange, value}) => {
    const [isMuted, setIsMuted] = useState(false);

    return (
        <Grid container justifyContent='center' alignItems='center' direction='row' gap={2}>
            <Grid item>
                <TransparentButton onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeOffRounded /> : <VolumeUpRounded />}
                </TransparentButton>
            </Grid>
            <Grid container item xs={5}>
                <SliderWrapper value={value} onChange={onChange} sx={{ color: 'primary.light' }} />
            </Grid>
        </Grid>
    );
}