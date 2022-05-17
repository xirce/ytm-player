import React from 'react';
import { QueryClient, QueryClientProvider } from "react-query";
import { Routes, Route } from 'react-router-dom';
import { Provider } from "react-redux";
import { Main } from './pages/Main/Main';
import { Layout } from './layouts/Layout';
import { MyLibrary } from './pages/MyLibrary/MyLibrary';
import { PlaylistPage } from './pages/Playlist/PlaylistPage';
import { Search } from './pages/Search/Search';
import { Playlists } from './pages/Playlists/Playlists';
import { Albums } from './pages/Albums/Albums';
import { Tracks } from './pages/Tracks/Tracks';
import { ProgressBar } from "./components/ProgressBar/ProgressBar";
import { store } from "./store";
import './App.css';
import { AlbumPage } from './pages/Album/AlbumPage';


const queryClient = new QueryClient();

export const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <ProgressBar/>
                <Routes>
                    <Route path="/" element={<Layout/>}>
                        <Route index element={<Main/>}/>
                        <Route path="myLibrary" element={<MyLibrary/>}>
                            <Route path="playlists" element={<Playlists/>}/>
                            <Route path="albums" element={<Albums/>}/>
                            <Route path="tracks" element={<Tracks/>}/>
                        </Route>
                        <Route path="playlist/:id" element={<PlaylistPage/>}/>
                        <Route path="album/:id" element={<AlbumPage/>}/>
                        <Route path="search" element={<Search/>}/>
                        <Route path="*" element={<Main/>}/>
                    </Route>
                </Routes>
            </Provider>
        </QueryClientProvider>
    );
}