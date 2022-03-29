import React from 'react';
import Box from "@mui/material/Box";

export const Track: React.FC = () => { 
    return (
        <div style={{display: 'flex', color: 'white'}}>
            <h3>1</h3>
            <Box sx={{ 
                width: 50, 
                height: 50,
                backgroundColor: 'white'
            }}/>
            <h3>Название трека</h3>
            <h3>3:30</h3>
        </div>
    );
}