import React from 'react';
import { QueryClient, QueryClientProvider } from "react-query";
import { Routes, Route } from 'react-router-dom';
import { Provider } from "react-redux";
import { PlaylistPage } from './pages/Playlist/PlaylistPage';
import { Search } from './pages/Search/Search';
import { ProgressBar } from "./components/ProgressBar/ProgressBar";
import { AlbumPage } from './pages/Album/AlbumPage';
import { Artist } from './pages/Artist/Artist';
import { Queue } from "./pages/Queue/Queue";
import { store } from "./store";
import './App.css';
import { Layout } from "./layouts/Layout";

const queryClient = new QueryClient();

export const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <ProgressBar />
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route path="playlist/:id" element={<PlaylistPage />} />
                        <Route path="album/:id" element={<AlbumPage />} />
                        <Route path="artist/:id" element={<Artist />} />
                        <Route path="search" element={<Search />} />
                        <Route path="queue" element={<Queue />} />
                        <Route path="*" element={<Queue />} />
                    </Route>
                </Routes>
            </Provider>
        </QueryClientProvider>
    );
}