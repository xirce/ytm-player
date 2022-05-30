import React from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import { Provider } from "react-redux";
import { PlaylistPage } from './pages/Playlist/PlaylistPage';
import { SearchPage } from './pages/Search/SearchPage';
import { ProgressBar } from "./components/ProgressBar/ProgressBar";
import { AlbumPage } from './pages/Album/AlbumPage';
import { ArtistPage } from './pages/Artist/ArtistPage';
import { RadioPage } from './pages/Radio/RadioPage';
import { QueuePage } from "./pages/Queue/QueuePage";
import { FilteredSearch } from './pages/SearchRes/FilteredSearch';
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
                        <Route path="radio/:id" element={<RadioPage />} />
                        <Route path="search" element={<SearchPage />} />
                        <Route path="search/:type" element={<FilteredSearch />} />
                        <Route path="queue" element={<QueuePage />} />
                        <Route path='*' element={<Navigate to="/queue" replace />} />
                    </Route>
                </Routes>
            </Provider>
        </BrowserRouter>
    );
}