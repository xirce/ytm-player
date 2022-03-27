import React from 'react';
import {Routes, Route} from 'react-router-dom';
import {MainPage} from './pages/MainPage';
import {Search} from './components/Search/Search';
import {Layout} from './components/Layout';
import {MyMusic} from './pages/MyMusic';
import './styles/App.css';
import { PlaylistPage } from './pages/PlaylistPage';

export const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Layout/>}>
                <Route index element={<MainPage/>}/>
                <Route path="search" element={<Search/>}/>
                <Route path="myMusic" element={<MyMusic />}/>
            </Route>
        </Routes>
    );
}