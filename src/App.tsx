import React from 'react';
import {Routes, Route} from 'react-router-dom';
import {MainPage} from './Pages/MainPage';
import {Search} from './Pages/Search';
import {Layout} from './components/Layout';
import './styles/App.css';


export const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Layout/>}>
                <Route index element={<MainPage/>}/>
                <Route path="search" element={<Search/>}/>
            </Route>
        </Routes>
    );
}