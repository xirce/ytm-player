import React, { useEffect, useState } from 'react';
import ThumbDownRoundedIcon from '@mui/icons-material/ThumbDownRounded';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ThumbUpRoundedIcon from '@mui/icons-material/ThumbUpRounded';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import type { TrackRating } from '../../../../shared';
import { useGetTrackRatingQuery, useSetTrackRatingMutation } from '../../apiClient';
import styles from './TrackRatingControls.module.css';

interface TrackRatingControlsProps {
    trackId: string;
}

export const TrackRatingControls: React.FC<TrackRatingControlsProps> = React.memo(({ trackId }) => {
    const { currentData, isLoading: isRatingLoading } = useGetTrackRatingQuery(trackId);
    const [setTrackRating, { isLoading: isSaving }] = useSetTrackRatingMutation();
    const [rating, setRating] = useState<TrackRating>('INDIFFERENT');

    useEffect(() => setRating(currentData?.rating ?? 'INDIFFERENT'), [currentData, trackId]);

    const updateRating = async (selected: Exclude<TrackRating, 'INDIFFERENT'>) => {
        if (isSaving || isRatingLoading) return;
        const previous = rating;
        const next = rating === selected ? 'INDIFFERENT' : selected;
        setRating(next);
        try {
            await setTrackRating({ id: trackId, rating: next }).unwrap();
        } catch {
            setRating(previous);
        }
    };

    return <div className={styles.controls} role='group' aria-label='Оценка трека' data-player-rating>
        <button
            className={`${styles.button} ${rating === 'LIKE' ? styles.active : ''}`}
            onClick={() => updateRating('LIKE')}
            aria-label={rating === 'LIKE' ? 'Убрать лайк' : 'Нравится'}
            aria-pressed={rating === 'LIKE'}
            disabled={isSaving || isRatingLoading}
        >
            {rating === 'LIKE' ? <ThumbUpRoundedIcon /> : <ThumbUpOutlinedIcon />}
        </button>
        <span className={styles.divider} />
        <button
            className={`${styles.button} ${rating === 'DISLIKE' ? styles.active : ''}`}
            onClick={() => updateRating('DISLIKE')}
            aria-label={rating === 'DISLIKE' ? 'Убрать дизлайк' : 'Не нравится'}
            aria-pressed={rating === 'DISLIKE'}
            disabled={isSaving || isRatingLoading}
        >
            {rating === 'DISLIKE' ? <ThumbDownRoundedIcon /> : <ThumbDownOutlinedIcon />}
        </button>
    </div>;
});
