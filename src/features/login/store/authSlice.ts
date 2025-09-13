import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// DTO пользователя из твоих контрактов
import type { RootState } from "@/store/types.ts";
import {authApi} from "@login/shared/api/authApi.ts";
import type {UserDto} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/UserDto.ts";

export interface AuthState {
    user: UserDto | null;
    isAuthenticated: boolean;
}

// Начальное состояние
const initialState: AuthState = {
    user: null,
    isAuthenticated: false
};

// Слайс
const slice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action: PayloadAction<UserDto>) => {
            state.user = action.payload ?? null;
            state.isAuthenticated = !!action.payload;
        },
        resetAuthState: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        }
    },

    extraReducers: (builder) => {
        builder
            .addMatcher(authApi.endpoints.logout.matchFulfilled, (state ) => {
                console.log("logout")
                state.user = null;
                state.isAuthenticated = false;
            })
    }
});

export const { setCredentials, resetAuthState } = slice.actions;

// Selectors (типизированные)
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectUsername = (state: RootState) => state.auth.user?.fullName ?? state.auth.user?.email ?? null;


// ---------------- PERSIST ----------------
// Конфиг persist лежит здесь, как ты просил.
// Храним только user и isAuthenticated (без isLoading/error).
export const authPersistConfig = {
    key: 'auth',
    storage,
    whitelist: ['user', 'isAuthenticated'],
};

// Экспортируем уже обёрнутый редьюсер
const authReducer = persistReducer(authPersistConfig, slice.reducer);
export default authReducer;
