import React from 'react';
import Box from "@mui/material/Box";
import styles from "./Track.module.css";

export const Track: React.FC = () => { 
    return (
        <div className={styles.container} style={{
            display: 'flex',
            color: 'white',
            margin: '20px'
        }}>
            <p style={{marginRight: "10px"}}>1</p>
            <Box className={styles.image} style={{
                width: 50, 
                height: 50,
                backgroundColor: 'white', 
                marginRight: "auto",
            }}/>
            <p style={{marginRight: "auto"}}> Название трека</p>
            <p>Артист</p>
            <p style={{marginLeft: 'auto'}}>3:30</p>
        </div>
    );
}