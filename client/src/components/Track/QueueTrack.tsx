import React from 'react';
import { ITrackProps, Track } from "./Track";
import { RemoveFromQueueAction } from '../Actions/RemoveFromQueueAction';
import styles from './QueueTrack.module.css';

export interface IQueueTrackProps {
    item: ITrackProps;
    itemSelected: number;
    dragHandleProps: object;
}

export class QueueTrack extends React.Component<IQueueTrackProps> {
    render() {
        const { item, dragHandleProps } = this.props;

        return (
            <div className={styles.container}>
                <div {...dragHandleProps}>
                    <Track {...item}>
                        <RemoveFromQueueAction index={item.index} />
                    </Track>
                </div>
            </div>
        );
    }
}