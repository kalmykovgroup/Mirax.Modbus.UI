// src/features/scenarioEditor/core/features/lockSystem/lockSlice.ts

import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store';

interface LockState {
    isLocked: boolean;
}

const initialState: LockState = {
    isLocked: false,
};

export const lockSlice = createSlice({
    name: 'scenarioLock',
    initialState,
    reducers: {
        toggleLock: (state) => {
            state.isLocked = !state.isLocked;
            console.log('[lockSlice] Lock toggled:', state.isLocked);
        },
        setLock: (state, action: PayloadAction<boolean>) => {
            state.isLocked = action.payload;
            console.log('[lockSlice] Lock set to:', state.isLocked);
        },
    },
});

export const { toggleLock, setLock } = lockSlice.actions;

export const selectIsLocked = (state: RootState) => state.scenarioLock.isLocked;

export default lockSlice.reducer;
