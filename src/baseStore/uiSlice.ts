import {createSlice} from "@reduxjs/toolkit";

type UiState = { pending: number; lockUi: boolean };
const initialState: UiState = {
    pending: 0,
    lockUi: false
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        incPending(state) { state.pending += 1; state.lockUi = state.pending > 0; },
        decPending(state) { state.pending = Math.max(0, state.pending - 1); state.lockUi = state.pending > 0; },
    },
});
export const { incPending, decPending } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
export const selectUiLocked = (s: { ui: UiState }) => s.ui.lockUi;