import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Main } from './Pages/Main/Main';
import { Search } from './components/Search/Search';
import { Layout } from './layouts/Layout';
import { MyLibrary } from './Pages/MyLibrary/MyLibrary';
import './App.css';
import { PlaylistPage } from './Pages/Playlist/PlaylistPage';
import NameContext from './context/PlaylistNameContext';


export const App: React.FC = () => {
    const [playlistName, setPlaylistName] = useState('');
    const value = {
        playlistName,
        setPlaylistName
    };
    return (
        <NameContext.Provider value={value}>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Main />} />
                    <Route path="search" element={<Search />} />
                    <Route path="myMusic" element={<MyLibrary />} />
                    <Route path="playlist" element={<PlaylistPage />} />
                </Route>
            </Routes>
        </NameContext.Provider>
    );
}