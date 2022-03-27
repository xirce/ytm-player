import { styled } from "@mui/material/styles";

export const PlayerButton = styled('button')({
    width: '2.1rem',
    height: '2.1rem',
    borderRadius: '50%',
});

export const TransparentButton = styled(PlayerButton)(({theme}) =>({
    color: theme.palette.primary.light,
    backgroundColor: 'transparent',
    '&:hover': {
        filter: 'brightness(200%)'
    },
    '&:active': {
        filter: 'brightness(100%)'
    }
}));