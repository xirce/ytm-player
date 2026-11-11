import { createContext, RefObject, useContext } from 'react';

export const ScrollContainerContext = createContext<RefObject<HTMLDivElement> | null>(null);

export const useScrollContainerRef = (): RefObject<HTMLDivElement> | null =>
    useContext(ScrollContainerContext);
