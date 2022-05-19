import React, { ReactNode } from 'react';

export interface IListProps<T> {
    title?: string;
    source: T[];
    renderItem: (item: T, index: number) => ReactNode;
}

export const List = <T, >(props: IListProps<T>) => {
    const { title, source, renderItem } = props;

    if (!source?.length) return null;

    return (
        <>
            {title && <h2>{title}</h2>}
            <div>
                {source?.map((item, index) => <React.Fragment key={index}>{renderItem(item, index)}</React.Fragment>)}
            </div>
        </>);
}