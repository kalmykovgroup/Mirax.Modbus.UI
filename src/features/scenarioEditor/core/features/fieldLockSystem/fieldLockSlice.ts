// src/features/scenarioEditor/core/features/fieldLockSystem/fieldLockSlice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/baseStore/store';

/**
 * Состояние группы полей
 */
export enum FieldGroupState {
    /** Видимо и доступно для редактирования */
    Visible = 'visible',
    /** Видимо, но заблокировано для редактирования */
    Locked = 'locked',
    /** Полностью скрыто */
    Hidden = 'hidden',
}

/**
 * Метаданные группы полей
 */
export interface FieldGroupMetadata {
    /** Уникальный идентификатор группы */
    id: string;
    /** Отображаемое название группы */
    label: string;
    /** Описание группы (опционально) */
    description?: string;
    /** Текущее состояние группы */
    state: FieldGroupState;
    /** Дата регистрации группы */
    registeredAt: number;
}

interface FieldLockState {
    /** Зарегистрированные группы полей */
    groups: Record<string, FieldGroupMetadata>;
    /** Глобальная блокировка всех полей */
    globalLock: boolean;
}

const initialState: FieldLockState = {
    groups: {},
    globalLock: false,
};

export const fieldLockSlice = createSlice({
    name: 'fieldLock',
    initialState,
    reducers: {
        /**
         * Регистрирует новую группу полей
         */
        registerGroup: (state, action: PayloadAction<{ id: string; label: string; description?: string }>) => {
            const { id, label, description } = action.payload;

            // Регистрируем только если группа еще не существует
            if (!state.groups[id]) {
                state.groups[id] = {
                    id,
                    label,
                    description,
                    state: FieldGroupState.Visible,
                    registeredAt: Date.now(),
                };
                console.log(`[fieldLockSlice] Group registered: ${id} (${label})`);
            }
        },

        /**
         * Устанавливает состояние группы
         */
        setGroupState: (state, action: PayloadAction<{ groupId: string; state: FieldGroupState }>) => {
            const { groupId, state: newState } = action.payload;

            if (state.groups[groupId]) {
                state.groups[groupId].state = newState;
                console.log(`[fieldLockSlice] Group ${groupId} state changed to: ${newState}`);
            } else {
                console.warn(`[fieldLockSlice] Cannot set state: group ${groupId} not registered`);
            }
        },

        /**
         * Циклически переключает состояние группы: visible → locked → hidden → visible
         */
        toggleGroupState: (state, action: PayloadAction<string>) => {
            const groupId = action.payload;
            const group = state.groups[groupId];

            if (group) {
                switch (group.state) {
                    case FieldGroupState.Visible:
                        group.state = FieldGroupState.Locked;
                        break;
                    case FieldGroupState.Locked:
                        group.state = FieldGroupState.Hidden;
                        break;
                    case FieldGroupState.Hidden:
                        group.state = FieldGroupState.Visible;
                        break;
                }
                console.log(`[fieldLockSlice] Group ${groupId} toggled to: ${group.state}`);
            }
        },

        /**
         * Устанавливает состояние для нескольких групп одновременно
         */
        setMultipleGroupStates: (state, action: PayloadAction<Array<{ groupId: string; state: FieldGroupState }>>) => {
            action.payload.forEach(({ groupId, state: newState }) => {
                if (state.groups[groupId]) {
                    state.groups[groupId].state = newState;
                }
            });
            console.log(`[fieldLockSlice] Multiple groups state updated: ${action.payload.length} groups`);
        },

        /**
         * Включает/выключает глобальную блокировку всех полей
         */
        setGlobalLock: (state, action: PayloadAction<boolean>) => {
            state.globalLock = action.payload;
            console.log(`[fieldLockSlice] Global lock: ${state.globalLock}`);
        },

        /**
         * Сбрасывает все группы в состояние Visible
         */
        resetAllGroups: (state) => {
            Object.values(state.groups).forEach((group) => {
                group.state = FieldGroupState.Visible;
            });
            console.log('[fieldLockSlice] All groups reset to visible');
        },

        /**
         * Удаляет группу из реестра (используется редко, для очистки)
         */
        unregisterGroup: (state, action: PayloadAction<string>) => {
            const groupId = action.payload;
            if (state.groups[groupId]) {
                delete state.groups[groupId];
                console.log(`[fieldLockSlice] Group unregistered: ${groupId}`);
            }
        },
    },
});

export const {
    registerGroup,
    setGroupState,
    toggleGroupState,
    setMultipleGroupStates,
    setGlobalLock,
    resetAllGroups,
    unregisterGroup,
} = fieldLockSlice.actions;

// Селекторы
export const selectAllGroups = (state: RootState) => state.fieldLock.groups;

export const selectGroupState = (groupId: string) => (state: RootState): FieldGroupState | undefined => {
    return state.fieldLock.groups[groupId]?.state;
};

export const selectIsGroupLocked = (groupId: string) => (state: RootState): boolean => {
    const globalLock = state.fieldLock.globalLock;
    const scenarioLock = state.scenarioLock?.isLocked ?? false;
    const groupState = state.fieldLock.groups[groupId]?.state;

    // Глобальная блокировка или блокировка карты переопределяет состояние группы
    if (globalLock || scenarioLock) return true;

    return groupState === FieldGroupState.Locked;
};

export const selectIsGroupHidden = (groupId: string) => (state: RootState): boolean => {
    const groupState = state.fieldLock.groups[groupId]?.state;
    return groupState === FieldGroupState.Hidden;
};

export const selectIsGroupVisible = (groupId: string) => (state: RootState): boolean => {
    const groupState = state.fieldLock.groups[groupId]?.state;
    return groupState === FieldGroupState.Visible || groupState === FieldGroupState.Locked;
};

export const selectGlobalLock = (state: RootState) => state.fieldLock.globalLock;

export const selectRegisteredGroupsCount = (state: RootState) => Object.keys(state.fieldLock.groups).length;

export const selectGroupsByState = (targetState: FieldGroupState) => (state: RootState): FieldGroupMetadata[] => {
    return Object.values(state.fieldLock.groups).filter((group) => group.state === targetState);
};

export default fieldLockSlice.reducer;
