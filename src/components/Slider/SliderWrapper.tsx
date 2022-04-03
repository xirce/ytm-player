import React, {MouseEventHandler} from 'react';
import Slider from "@mui/material/Slider";

export interface SliderProps {
    onChange?: (event: Event, value: number) => void;
    onMouseDown?: MouseEventHandler;
    onMouseUp?: MouseEventHandler;
    value?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
}

export const SliderWrapper: React.FC<SliderProps> = props => {
    return (
        <Slider
            onMouseDown={props.onMouseDown}
            onMouseUp={props.onMouseUp}
            onChange={(event, value, _) =>
                props.onChange && props.onChange(event, value as number)}
            value={props.value}
            defaultValue={props.defaultValue}
            min={props.min}
            max={props.max ?? 1}
            step={props.step ?? 0.01}
            size='small'
            sx={{
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