import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import styles from './LoginPage.module.css'
import {nameof} from "@app/lib/utils/nameof.ts";
import {useTheme} from "@app/providers/theme/useTheme.ts";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/store/hooks.ts";
import {useNavigate} from "react-router-dom";
import {ROUTES} from "@app/constants/routes.ts";
import {useEffect, useState} from "react";
import {useLoginMutation} from "@shared/api/authApi.ts";
import type {LoginResponse} from "@shared/contracts/Dtos/UserDtos/Users/Login/LoginResponse.ts";
import {mapServerErrorsToForm, mapServerPayloadErrorsToForm} from "@app/lib/forms/serverErrorMapper.ts";
import Logo from "@ui/components/Logo/Logo.tsx";
import {selectIsAuthenticated, setCredentials} from "@/store/features/user/authSlice.ts";

const loginSchema = z.object({
    email: z.string().min(1, 'Введите имя пользователя'),
    password: z.string().min(5, 'Минимум 5 символов'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginPage = () => {
    const { theme } = useTheme();
    const dispatch = useAppDispatch()
    const navigate = useNavigate();

    const [loginRequest, { isLoading  }] = useLoginMutation()


    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: 'tester@example.com',
            password: 'Tester123!',
        },
    })

    const isAuthenticated = useSelector(selectIsAuthenticated);

    const FIELD_MAP = { username: 'email' } as const

    const onSubmit = async (data: LoginFormData) => {

        try {


            const response: LoginResponse = await loginRequest({ email: data.email, password: data.password }).unwrap()


            // успех: resp — это LoginResponse (уже без ApiResponse-обёртки)
            // здесь делай редирект/тост и т.п.
            if(response.success){
                if(response.user == null){
                    return;
                }

                dispatch(setCredentials(response.user))
                navigate(ROUTES.HOME);
            }else{
                mapServerErrorsToForm<LoginFormData>({
                    errors: response.errors,
                    setError,
                    knownFields: ['email', 'password'],
                    fieldMap: FIELD_MAP,
                    defaultMessage: 'Неверные учётные данные'
                })
            }

        } catch (err: any) {
            // HTTP/сетевая ошибка ИЛИ (если решишь) логическая ошибка, если будешь бросать её в transformResponse
            mapServerPayloadErrorsToForm<LoginFormData>(
                err?.data,
                setError,
                ['email', 'password'],
                FIELD_MAP,
                'Ошибка авторизации'
            )
        }


    };

    useEffect(() => {
        if (isAuthenticated) {
            navigate(ROUTES.HOME);
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className={styles.container}>
            <Logo width={200} height={100}/>

            <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <input
                        className={styles.email}
                        placeholder="Email"
                        {...register(nameof<LoginFormData>('email'))} // Using nameof to ensure type safety
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                </div>

                <div>
                    <input
                        type="password"
                        className={styles.password}
                        placeholder="Password"
                        {...register(nameof<LoginFormData>('password'))}
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Входим...' : 'Войти'}
                </button>

                {errors.root && (
                    <p className="text-red-500 text-sm">{errors.root.message as string}</p>
                )}
            </form>
        </div>
    )
}

export default LoginPage
