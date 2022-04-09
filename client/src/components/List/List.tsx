import React, { ReactNode } from 'react';

export interface ListProps {
    source: any[];
    renderItem: (item: any) => ReactNode;
}

export const List: React.FC<ListProps> = ({ source, renderItem }) => {
    return (
        <div>
            {source?.map(renderItem)}
        </div>);
}