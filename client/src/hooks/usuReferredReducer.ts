import {Dispatch, MutableRefObject, useReducer, useRef} from "react";

export const usuReferredReducer = <TState, TAction>(
    reducer: (state: TState, action: TAction) => TState,
    initState: TState
): [MutableRefObject<TState>, Dispatch<TAction>] => {
    const stateRef = useRef(initState);
    return [
        stateRef,
        useReducer(
            (state: TState, action: TAction) => {
                stateRef.current = reducer(state, action);
                return stateRef.current;
            },
            initState
        )[1],
    ]
}