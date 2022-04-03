import {
    Dispatch,
    ReducerState,
    useCallback,
    useReducer,
    useRef
} from "react";

export const useEnhancedReducer = <TState, TAction>(
    reducer: (state: TState, action: TAction) => TState,
    initState: TState
): [ReducerState<(state: TState, action: TAction) => TState>, Dispatch<TAction>, () => TState] => {
    const lastState = useRef(initState);
    const getState = useCallback(() => lastState.current, []);
    return [
        ...useReducer(
            (state: TState, action: TAction) => lastState.current = reducer(state, action),
            initState
        ),
        getState
    ]
}