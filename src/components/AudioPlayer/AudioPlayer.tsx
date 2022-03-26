import {
    PauseRounded,
    PlayArrowRounded,
    SkipNextRounded,
    SkipPreviousRounded,
    VolumeOffRounded,
    VolumeUpRounded
} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import React, {useRef, useState} from 'react';
import {SliderWrapper} from '../Slider/SliderWrapper';
import {styled} from "@mui/material/styles";

const Button = styled('button')({
    width: '2.1rem',
    height: '2.1rem',
});

const TransparentButton = styled(Button)(({theme}) =>({
    color: theme.palette.primary.light,
    backgroundColor: 'transparent',
    '&:hover': {
        filter: 'brightness(200%)'
    },
    '&:active': {
        filter: 'brightness(100%)'
    }
}));

export const AudioPlayer: React.FC = () => {
    const audio = useRef(new Audio());
    const [isPlaying, setPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    return (
        <Grid container
              justifyContent='center'
              alignItems='center'
              sx={(theme) => ({
                  height: '6rem',
                  color: theme.palette.primary.light,
                  backgroundColor: theme.palette.primary.dark,
                  borderTop: '1px solid',
                  borderTopColor: theme.palette.primary.main,
                  padding: '0 1rem',
                  textAlign: 'center',
              })}
        >
            <Grid item xs>ИНФОРМАЦИЯ О ТРЕКЕ</Grid>
            <Grid item xs={4}>
                <Stack>
                    <Grid container justifyContent='center' alignItems='center' gap={2} marginBottom={2}>
                        <TransparentButton>
                            <SkipPreviousRounded fontSize='large'/>
                        </TransparentButton>
                        <Button
                            onClick={() => setPlaying(!isPlaying)}
                            sx={(theme) => ({
                                borderRadius: '50%',
                                backgroundColor: theme.palette.text.primary
                            })}
                        >
                            {isPlaying ? <PlayArrowRounded fontSize='medium'/> : <PauseRounded fontSize='medium'/>}
                        </Button>
                        <TransparentButton>
                            <SkipNextRounded fontSize='large'/>
                        </TransparentButton>
                    </Grid>
                    <Grid container>
                        <SliderWrapper sx={{color: 'primary.light'}}/>
                    </Grid>
                </Stack>
            </Grid>
            <Grid item xs>
                <Grid container justifyContent='center' alignItems='center' direction='row' gap={2}>
                    <Grid item>
                        <TransparentButton onClick={() => setIsMuted(!isMuted)}>
                            {isMuted ? <VolumeOffRounded/> : <VolumeUpRounded/>}
                        </TransparentButton>
                    </Grid>
                    <Grid container item xs={5}>
                        <SliderWrapper sx={{color: 'primary.light'}}/>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>);
}