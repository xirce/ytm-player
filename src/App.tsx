import React from 'react';
import {Routes, Route} from 'react-router-dom';
import {Main} from './Pages/Main/Main';
import {Layout} from './layouts/Layout';
import {MyLibrary} from './Pages/MyLibrary/MyLibrary';
import './App.css';
import {PlaylistPage} from './Pages/Playlist/PlaylistPage';
import {Search} from './Pages/Search/Search';
import {PlayerProvider} from './context/PlayerContext/PlayerContext';


export const App: React.FC = () => {
    return (
        <PlayerProvider>
            <Routes>
                <Route path="/" element={<Layout/>}>
                    <Route index element={<Main/>}/>
                    <Route path="search" element={<Search/>}/>
                    <Route path="myLibrary" element={<MyLibrary/>}/>
                    <Route path="playlist" element={<PlaylistPage/>}/>
                </Route>
            </Routes>
        </PlayerProvider>
    );
}