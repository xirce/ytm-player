import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { Provider } from "react-redux";
import { PlaylistPage } from './pages/Playlist/PlaylistPage';
import { SearchPage } from './pages/Search/SearchPage';
import { ProgressBar } from "./components/ProgressBar/ProgressBar";
import { AlbumPage } from './pages/Album/AlbumPage';
import { ArtistPage } from './pages/Artist/ArtistPage';
import { QueuePage } from "./pages/Queue/QueuePage";
import { Layout } from "./layouts/Layout";
import { store } from "./store";
import './App.css';

export const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Provider store={store}>
                <ProgressBar />
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route path="playlist/:id" element={<PlaylistPage />} />
                        <Route path="album/:id" element={<AlbumPage />} />
                        <Route path="artist/:id" element={<ArtistPage />} />
                        <Route path="search" element={<SearchPage />} />
                        <Route path="queue" element={<QueuePage />} />
                        <Route path="*" element={<QueuePage />} />
                    </Route>
                </Routes>
            </Provider>
        </BrowserRouter>
    );
}