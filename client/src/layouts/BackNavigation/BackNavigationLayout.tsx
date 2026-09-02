import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import styles from './BackNavigationLayout.module.css';

export const BackNavigationLayout: React.FC = () => {
    const navigate = useNavigate();
    const goBack = () => {
        if (window.history.state?.idx > 0) {
            navigate(-1);
        } else {
            navigate('/', { replace: true });
        }
    };

    return (
        <div className={styles.container}>
            <button type="button" className={styles.back} onClick={goBack} aria-label="Назад" title="Назад">
                <KeyboardArrowLeftIcon fontSize="large" />
            </button>
            <Outlet />
        </div>
    );
};
