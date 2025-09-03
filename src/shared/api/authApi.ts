// src/shared/api/authApi.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { axiosBaseQuery } from './base/baseQuery'

// Контракты (развёрнутые типы, без ApiResponse):
import { API } from '@shared/contracts/endpoints.ts'
import type {LoginResponse} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/Login/LoginResponse.ts";
import type {LoginRequest} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/Login/LoginRequest.ts";
import type {RegisterRequest} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/Register/RegisterRequest.ts";
import type {
    InitiatePasswordResetRequest
} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/InitiatePasswordResetRequest.ts";
import type {
    ResetUserPasswordRequest
} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/ResetPassword/ResetUserPasswordRequest.ts";

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: axiosBaseQuery(), // <-- уже разворачивает ApiResponse<T>
    endpoints: (builder) => ({
        // ======== AUTH ========

        // Login: сервер кладёт токен в HttpOnly cookie, ответ: LoginResponse (может содержать user)
        login: builder.mutation<LoginResponse, LoginRequest>({
            query: (body) => ({
                url: API.USER.LOGIN,
                method: 'post',
                data: body
            })
        }),

        // Logout: true/false
        logout: builder.mutation<boolean, void>({
            query: () => ({
                url: API.USER.LOGOUT,
                method: 'post'
            })
        }),

        // /me: по твоим словам — строка "Вы авторизованы. Ваш ID: {guid}"
        // Если бэк когда-нибудь начнёт возвращать ApiResponse<UserDto>,
        // baseQuery сам развернёт до UserDto.
        me: builder.query<string | unknown, void>({
            query: () => ({
                url: API.USER.ME,
                method: 'get'
            })
        }),

        register: builder.mutation<boolean, RegisterRequest>({
            query: (body) => ({
                url: API.USER.REGISTER,
                method: 'post',
                data: body
            })
        }),

        initiatePasswordReset: builder.mutation<boolean, InitiatePasswordResetRequest>({
            query: (body) => ({
                url: API.USER.INITIATE_PASSWORD_RESET,
                method: 'post',
                data: body
            })
        }),

        resetPassword: builder.mutation<boolean, ResetUserPasswordRequest>({
            query: (body) => ({
                url: API.USER.RESET_PASSWORD,
                method: 'post',
                data: body
            })
        })
    })
})

export const {
    useLoginMutation,
    useLogoutMutation,
    useMeQuery,
    useRegisterMutation,
    useInitiatePasswordResetMutation,
    useResetPasswordMutation
} = authApi
