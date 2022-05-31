import React, { ReactNode } from 'react';
import styles from './List.module.css';

export interface IListProps<T> {
    title?: string;
    source: T[] | undefined;
    renderItem: (item: T, index: number) => ReactNode;
}

export const List = <T,>(props: IListProps<T>) => {
    const { title, source, renderItem } = props;

    if (!source?.length) return null;

    return (
        <div className={styles.container}>
            {title && <h2>{title}</h2>}
            <div>
                {source?.map((item, index) => <React.Fragment key={index}>{renderItem(item, index)}</React.Fragment>)}
            </div>
        </div>);
}