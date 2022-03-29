import React, {useContext} from "react";
import NameContext from "../../context/PlaylistNameContext";
import Box from "@mui/material/Box";
import {Track} from "../../components/Track/Track";

export const PlaylistPage: React.FC= () => {
    const value = useContext(NameContext);
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
                    <h1>{value.playlistName}</h1>
                    <h2>Автор</h2>
                    <h2>Длительность / Кол-во треков</h2>
                </div>
            </div>
            <div className="tracks">
                <h2 style={{color: 'white'}}>Список треков</h2>
            </div>
        </div>
    );
}