import React, { useEffect, useState } from 'react';
import { LinearProgress } from "@mui/material";
import styles from './ProgressBar.module.css';
import { instance } from '../../apiClient';

export const ProgressBar: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        instance.interceptors.request.use(config => {
            setIsLoading(true);
            return config;
        });

        instance.interceptors.response.use(
            response => {
                setIsLoading(false);
                return response;
            },
            error => {
                setIsLoading(false);
                return Promise.reject(error);
            }
        );
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
