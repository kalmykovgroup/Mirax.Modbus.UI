import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from "@/store/types";
import storage from "redux-persist/lib/storage";
import {persistReducer} from "redux-persist";
import type {UserDto} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/UserDto.ts";


/**
 * userSlice — отдельный slice для работы с сущностью User в UI.
 * Здесь можно хранить выбранного пользователя, локальные фильтры/состояния форм и т.д.
 * Сами запросы и кэш берём из RTK Query (userApi).
 */

export interface UsersState {
    selected: UserDto | null;      // текущий выбранный пользователь (для просмотра/редактирования)
    isEditing: boolean;            // флаг режима редактирования
    formError: string | null;      // локальная ошибка формы
    lastActive: number;
}

const initialState: UsersState = {
    selected: null,
    isEditing: false,
    formError: null,
    lastActive: Date.now()
};

const userSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        setSelectedUser: (state, action: PayloadAction<UserDto | null>) => {
            state.selected = action.payload;
            state.formError = null;
        },
        updateLastActive: (state ) => {
            state.lastActive = Date.now();
        },
        startEditSelected: (state) => {
            state.isEditing = true;
        },
        cancelEditSelected: (state) => {
            state.isEditing = false;
            state.formError = null;
        },
        setUserFormError: (state, action: PayloadAction<string | null>) => {
            state.formError = action.payload;
        },
        // Удобный helper: обновить выбранного пользователя после успешного апдейта
        mergeSelectedUser: (state, action: PayloadAction<Partial<UserDto>>) => {
            if (!state.selected) return;
            state.selected = { ...state.selected, ...action.payload };
        },
        clearSelectedUser: (state) => {
            state.selected = null;
            state.isEditing = false;
            state.formError = null;
        },
    },
});

export const {
    setSelectedUser,
    startEditSelected,
    cancelEditSelected,
    setUserFormError,
    mergeSelectedUser,
    clearSelectedUser,
    updateLastActive
} = userSlice.actions;

// Selectors
export const selectUsersState = (state: RootState) => state.users;
export const selectLastActive = (state: RootState) => state.users.lastActive
export const selectSelectedUser = (state: RootState) => state.users.selected;
export const selectIsEditingUser = (state: RootState) => state.users.isEditing;
export const selectUserFormError = (state: RootState) => state.users.formError;


export const userPersistConfig = {
    key: 'user',
    storage,
    whitelist: [],
};

const userReducer = persistReducer(userPersistConfig, userSlice.reducer);
export default userReducer;

