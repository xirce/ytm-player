import React, {useEffect, useState} from 'react';
import {LinearProgress} from "@mui/material";
import apiClient from '../../apiClient';
import styles from './ProgressBar.module.css';

export const ProgressBar: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        apiClient.interceptors.request.use(config => {
            setIsLoading(true);
            return config;
        });

        apiClient.interceptors.response.use(config => {
            setIsLoading(false);
            return config;
        });
    }, []);

    return (
        <div className={styles.container}>
            <LinearProgress
                variant='indeterminate'
                sx={{
                    height: '4px',
                    backgroundColor: 'var(--bg-dark-color)',
                    '& .MuiLinearProgress-bar': {
                        display: isLoading ? 'block' : 'none',
                        backgroundColor: 'var(--progress-var-color)'
                    }
                }}
            />
        </div>
    );
};
