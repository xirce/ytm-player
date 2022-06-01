import React from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import { Provider } from "react-redux";
import { PlaylistPage } from './pages/Playlist/PlaylistPage';
import { SearchPage } from './pages/Search/SearchPage';
import { ProgressBar } from "./components/ProgressBar/ProgressBar";
import { AlbumPage } from './pages/Album/AlbumPage';
import { ArtistPage } from './pages/Artist/ArtistPage';
import { QueuePage } from "./pages/Queue/QueuePage";
import { FilteredSearchPage } from './pages/SearchRes/FilteredSearchPage';
import { Layout } from "./layouts/Default/Layout";
import { FiltersLayout } from "./layouts/Filters/FiltersLayout";
import { store } from "./store";
import './App.css';

export const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Provider store={store}>
                <ProgressBar />
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route path="search" element={<FiltersLayout />}>
                            <Route index element={<SearchPage />} />
                            <Route path=":type" element={<FilteredSearchPage />} />
                        </Route>
                        <Route path="playlist/:id" element={<PlaylistPage />} />
                        <Route path="album/:id" element={<AlbumPage />} />
                        <Route path="artist/:id" element={<ArtistPage />} />
                        <Route path="queue" element={<QueuePage />} />
                        <Route path='*' element={<Navigate to="queue" replace />} />
                    </Route>
                </Routes>
            </Provider>
        </BrowserRouter>
    );
}