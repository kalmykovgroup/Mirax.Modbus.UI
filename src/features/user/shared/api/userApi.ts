// src/shared/api/userApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@shared/api/base/baseQuery.ts';

// Типы

import {API} from "@app/providers/endpoints.ts";
import type {CreateUserRequest} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/CreateUserRequest.ts";
import type {ApiResponse} from "@shared/contracts/Dtos/RemoteDtos/CommonDtos/ApiResponse.ts";
import type {UserExistsRequest} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/UserExistsRequest.ts";
import type {UpdateUserRequest} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/UpdateUserRequest.ts";
import type {GetUserByEmailRequest} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/GetUserByEmailRequest.ts";
import type {UserDto} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/UserDto.ts";
import type {GetUserByIdRequest} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/GetUserByIdRequest.ts";
import type {GetAllUsersRequest} from "@shared/contracts/Dtos/RemoteDtos/UserDtos/Users/GetAllUsersRequest.ts";

export const userApi = createApi({
    reducerPath: 'userApi',
    baseQuery: axiosBaseQuery(),
    tagTypes: ['User'],

    endpoints: (builder) => ({
        getAllUsers: builder.query<UserDto[], GetAllUsersRequest | void>({
            query: (params) => ({
                url: API.USER.GET_ALL,
                method: 'get',
                params,
            }),
            providesTags: ['User'],
        }),

        // По контроллеру: id — отдельным аргументом метода, запросные параметры — через [FromQuery]
        getUserById: builder.query<
            ApiResponse<UserDto>,
            { id: string; request?: GetUserByIdRequest }
        >({
            query: ({ id, request }) => ({
                url: API.USER.BY_ID(id),
                method: 'get',
                params: { id, ...(request ?? {}) }
            }),
            providesTags: (_res, _err, arg) => [{ type: 'User', id: arg.id }] as any,
        }),

        getUserByEmail: builder.query<
            ApiResponse<UserDto>,
            { email: string; request?: GetUserByEmailRequest }
        >({
            query: ({ email, request }) => ({
                url: API.USER.BY_EMAIL,
                method: 'get',
                params: { email, ...(request ?? {}) },
            }),
            providesTags: ['User'],
        }),

        userExists: builder.query<boolean, UserExistsRequest>({
            query: (params) => ({
                url: API.USER.EXISTS,
                method: 'get',
                params,
            }),
        }),

        createUser: builder.mutation<boolean, CreateUserRequest>({
            query: (body) => ({
                url: API.USER.CREATE,
                method: 'post',
                data: body,
            }),
            invalidatesTags: ['User'],
        }),

        updateUser: builder.mutation<
            ApiResponse<boolean>,
            { id: string; body: UpdateUserRequest }
        >({
            // Контроллер ожидает Guid id как аргумент метода + тело запроса.
            // Роут без "/{id}", поэтому передаём id в query string.
            query: ({ id, body }) => ({
                url: API.USER.UPDATE(id),
                method: 'put',
                data: body,
                params: { id },
            }),
            invalidatesTags: (_res, _err, arg) => [{ type: 'User', id: arg.id }] as any,
        }),

        deleteUser: builder.mutation<boolean, { id: string }>({
            query: ({ id }) => ({
                url: API.USER.DELETE(id),
                method: 'delete',
                params: { id },
            }),
            invalidatesTags: (_res, _err, arg) => [{ type: 'User', id: arg.id }] as any,
        }),
    }),
});

export const {
    useGetAllUsersQuery,
    useGetUserByIdQuery,
    useGetUserByEmailQuery,
    useUserExistsQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
} = userApi;
