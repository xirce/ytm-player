import React from 'react';
import Slider, {SliderProps} from "@mui/material/Slider";

export const SliderWrapper: React.FC<SliderProps> = ({sx, onChange}) => {
    return (
        <Slider
            onChange={onChange}
            size='small'
            sx={{
                ...sx,
                height: 3.5,
                padding: 0,
                '& .MuiSlider-thumb': {
                    display: 'none',
                    filter: 'brightness(150%)',
                    '&:hover, &.Mui-focusVisible, &.Mui-active': {
                        boxShadow: 'none',
                    },
                    '&:hover, &.Mui-active': {
                        display: 'block'
                    }
                },
                '&:hover .MuiSlider-thumb': {
                    display: 'block'
                }
            }}/>);
};