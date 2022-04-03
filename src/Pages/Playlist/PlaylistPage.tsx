import React from "react";
import {useSearchParams} from 'react-router-dom';
import Box from "@mui/material/Box";
import {Track} from "../../components/Track/Track";

export const PlaylistPage: React.FC= () => {
    const [searchParams, setSearchParams] = useSearchParams();

    return (
        <div style={{padding: '20px'}}>
            <div style={{display: 'flex', color:'white', flexWrap: 'wrap', gap: '20px'}}>
                <Box sx={{
                    width: 264, 
                    height: 264,
                    backgroundColor: 'white'
                    }}>
                </Box>
                <div className="description">
                    <h1>{searchParams.get('name')}</h1>
                    <h2>Автор</h2>
                    <h2>Длительность / Кол-во треков</h2>
                </div>
            </div>
            <div className="tracks">
                <h2 style={{color: 'white'}}>Список треков</h2>
                <Track />
                <Track />
                <Track />
            </div>
        </div>
    );
}