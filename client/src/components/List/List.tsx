import React, { ReactNode } from 'react';

export interface ListProps {
    title?: string;
    source: any[];
    renderItem: (item: any) => ReactNode;
}

export const List: React.FC<ListProps> = ({ title, source, renderItem }) => {
    if (!source?.length) return null;

    return (
        <>
            {title && <h2>{title}</h2>}
            <div>
                {source?.map((item, index) => <React.Fragment key={index}>{renderItem(item)}</React.Fragment>)}
            </div>
        </>);
}