import React from 'react';
import { ITrackProps, Track } from "./Track";
import { RemoveFromQueueAction } from '../Actions/RemoveFromQueueAction';
import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded';
import styles from './QueueTrack.module.css';

export interface IQueueTrackProps {
    item: ITrackProps;
    itemSelected: number;
    dragHandleProps: object;
}

export class QueueTrack extends React.Component<IQueueTrackProps> {
    render() {
        const { item, dragHandleProps } = this.props;
        const isMobile = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;

        return (
            <div className={styles.container} {...(!isMobile ? dragHandleProps : {})}>
                <div className={styles.track}>
                    <Track {...item} playOnRowClick={isMobile} mobileDragHandle={isMobile}>
                        <RemoveFromQueueAction index={item.index} />
                    </Track>
                </div>
                {isMobile && (
                    <div
                        {...dragHandleProps}
                        className={styles.dragHandle}
                        data-drag-handle
                        aria-label='Перетащить трек'
                    >
                        <DragIndicatorRounded />
                    </div>
                )}
            </div>
        );
    }
}
