import { bindActionCreators, configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { playerSlice } from "./player";

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const store = configureStore({
    reducer: {
        player: playerSlice.reducer
    },
});

export const useAppAction = () => {
    const dispatch = useAppDispatch();

    return bindActionCreators({
        ...playerSlice.actions
    }, dispatch);
}
