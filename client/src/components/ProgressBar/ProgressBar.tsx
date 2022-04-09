import React, {useEffect, useState} from 'react';
import {LinearProgress} from "@mui/material";
import apiClient from '../../apiClient';
import styles from './ProgressBar.module.css';

export const ProgressBar: React.FC = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        apiClient.defaults.onUploadProgress = event => {
            const currentProgress = 100 * event.loaded / event.total;
            setProgress(currentProgress % 100);
        };
    }, []);

    return (
        <div className={styles.container}>
            <LinearProgress
                variant='determinate'
                value={progress}
                sx={{
                    height: '4px',
                    backgroundColor: 'var(--bg-dark-color)',
                    bar1Determinate: {
                        backgroundColor: 'blue'
                    }
                }}
            />
        </div>
    );
};
