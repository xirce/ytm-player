import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LinearProgress } from "@mui/material";
import styles from './ProgressBar.module.css';

export const ProgressBar: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        axios.interceptors.request.use(config => {
            setIsLoading(true);
            return config;
        });

        axios.interceptors.response.use(config => {
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
