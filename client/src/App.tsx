import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Main } from './pages/Main/Main';
import { Layout } from './layouts/Layout';
import { MyLibrary } from './pages/MyLibrary/MyLibrary';
import './App.css';
import { PlaylistPage } from './pages/Playlist/PlaylistPage';
<<<<<<< HEAD
import { Search } from './pages/Search/Search';
=======
import { SearchAll } from './pages/SearchAll/SearchAll';
>>>>>>> 2e348c2e87cdbb915edb247c41480c20d8733ee2
import { PlayerProvider } from './context/PlayerContext/PlayerContext';
import { QueryClient, QueryClientProvider } from "react-query";
import { Playlists } from './pages/Playlists/Playlists';
import { Albums } from './pages/Albums/Albums';
import { Tracks } from './pages/Tracks/Tracks';
import { ProgressBar } from "./components/ProgressBar/ProgressBar";


const queryClient = new QueryClient();


export const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <PlayerProvider>
                <ProgressBar />
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Main />} />
                        <Route path="myLibrary" element={<MyLibrary />}>
                            <Route path="playlists" element={<Playlists />} />
                            <Route path="albums" element={<Albums />} />
                            <Route path="tracks" element={<Tracks />} />
                        </Route>
                        <Route path="playlist/:id" element={<PlaylistPage />} />
                        <Route path="search" element={<Search />} />
                        <Route path="*" element={<Main />} />
                    </Route>
                </Routes>
            </PlayerProvider>
        </QueryClientProvider>
    );
}