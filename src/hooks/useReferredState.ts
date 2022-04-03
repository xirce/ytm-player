import React, {useRef, useState} from "react";

export const useReferredState = <T>(initialValue: T | undefined = undefined):
    [React.MutableRefObject<T | undefined>, React.Dispatch<T>] => {
    const [state, setState] = useState(initialValue);
    const reference = useRef(state);

    const setReferredState = (value: T) => {
        reference.current = value;
        setState(value);
    };

    return [reference, setReferredState];
};