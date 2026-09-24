import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useNavigateBack = () => {
    const navigate = useNavigate();

    return useCallback(() => {
        if (window.history.state?.idx > 0) {
            navigate(-1);
        } else {
            navigate('/', { replace: true });
        }
    }, [navigate]);
};
