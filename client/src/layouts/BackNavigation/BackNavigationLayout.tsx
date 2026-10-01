import React from 'react';
import { Outlet } from 'react-router-dom';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import { useNavigateBack } from '../../hooks/useNavigateBack';
import styles from './BackNavigationLayout.module.css';

export const BackNavigationLayout: React.FC = () => {
    const goBack = useNavigateBack();

    return (
        <div className={styles.container}>
            <div className={styles.backPositioner}>
                <button type="button" className={styles.back} onClick={goBack} aria-label="Назад" title="Назад">
                    <KeyboardArrowLeftIcon fontSize="large" />
                </button>
            </div>
            <Outlet />
        </div>
    );
};
