import React from 'react';
import Slider, {SliderProps} from "@mui/material/Slider";

export const SliderWrapper: React.FC<SliderProps> = (props) => {
    return (
        <Slider
            {...props}
            size='small'
            sx={{
                ...props.sx,
                color: 'inherit',
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