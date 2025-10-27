// src/features/scenarioEditor/core/features/saveSystem/saveSettingsSlice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store';

export interface SaveSettingsState {
    autoSave: boolean;
    saveInProgress: boolean;
    lastSaveTimestamp: number | null;
    lastSaveError: string | null;
}

const STORAGE_KEY = 'scenarioEditor.saveSettings';

// Загружаем настройки из localStorage
function loadSettingsFromStorage(): Pick<SaveSettingsState, 'autoSave'> {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                autoSave: parsed.autoSave ?? true, // По умолчанию включено
            };
        }
    } catch (err) {
        console.warn('[saveSettingsSlice] Failed to load settings from localStorage:', err);
    }

    return { autoSave: true };
}

// Сохраняем настройки в localStorage
function saveSettingsToStorage(autoSave: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ autoSave }));
    } catch (err) {
        console.warn('[saveSettingsSlice] Failed to save settings to localStorage:', err);
    }
}

const initialState: SaveSettingsState = {
    ...loadSettingsFromStorage(),
    saveInProgress: false,
    lastSaveTimestamp: null,
    lastSaveError: null,
};

export const saveSettingsSlice = createSlice({
    name: 'saveSettings',
    initialState,
    reducers: {
        setAutoSave: (state, action: PayloadAction<boolean>) => {
            state.autoSave = action.payload;
            saveSettingsToStorage(action.payload);
            console.log('[saveSettingsSlice] Auto-save set to:', action.payload);
        },

        setSaveInProgress: (state, action: PayloadAction<boolean>) => {
            state.saveInProgress = action.payload;

            // Очищаем ошибку при начале нового сохранения
            if (action.payload) {
                state.lastSaveError = null;
            }
        },

        setSaveSuccess: (state, action: PayloadAction<number>) => {
            state.saveInProgress = false;
            state.lastSaveTimestamp = action.payload;
            state.lastSaveError = null;
            console.log('[saveSettingsSlice] Save successful at:', new Date(action.payload).toLocaleTimeString());
        },

        setSaveError: (state, action: PayloadAction<string>) => {
            state.saveInProgress = false;
            state.lastSaveError = action.payload;
            console.error('[saveSettingsSlice] Save error:', action.payload);
        },

        clearSaveError: (state) => {
            state.lastSaveError = null;
        },
    },
});

export const {
    setAutoSave,
    setSaveInProgress,
    setSaveSuccess,
    setSaveError,
    clearSaveError,
} = saveSettingsSlice.actions;

export default saveSettingsSlice.reducer;

// Selectors
export const selectAutoSave = (state: RootState) => state.saveSettings.autoSave;
export const selectSaveInProgress = (state: RootState) => state.saveSettings.saveInProgress;
export const selectLastSaveTimestamp = (state: RootState) => state.saveSettings.lastSaveTimestamp;
export const selectLastSaveError = (state: RootState) => state.saveSettings.lastSaveError;
