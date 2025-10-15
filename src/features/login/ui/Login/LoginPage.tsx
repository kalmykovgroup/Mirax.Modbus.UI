import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import styles from './LoginPage.module.css'
import {nameof} from "@app/lib/utils/nameof.ts";
import {useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";
import {ROUTES} from "@app/constants/routes.ts";
import {useEffect} from "react";
import {useLoginMutation} from "@login/shared/api/authApi.ts";
import type {LoginResponse} from "@/features/user/shared/dtos/Users/Login/LoginResponse.ts";
import {mapServerErrorsToForm, mapServerPayloadErrorsToForm} from "@login/lib/serverErrorMapper.ts";
import Logo from "@ui/components/Logo/Logo.tsx";
import {selectIsAuthenticated, setCredentials} from "@login/store/authSlice.ts";
import {useDocumentTitle} from "@app/lib/hooks/DocumentTitleContext.tsx";
import {useAppDispatch} from "@/baseStore/hooks.ts";

const loginSchema = z.object({
    email: z.string().min(1, 'Введите имя пользователя'),
    password: z.string().min(5, 'Минимум 5 символов'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const LoginPage = () => {
    useDocumentTitle('Вход');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const [loginRequest] = useLoginMutation()

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

    const onSubmit = async (data: LoginFormData): Promise<void> => {
        try {
            const response: LoginResponse = await loginRequest({
                email: data.email,
                password: data.password
            }).unwrap()

            if(response.success){
                if(response.user == null){
                    setError('root', {
                        type: 'server',
                        message: 'Ошибка: данные пользователя отсутствуют'
                    })
                    return;
                }

                dispatch(setCredentials(response.user))
                navigate(ROUTES.HOME);
            } else {
                // Исправлено: setError вместо setChartTemplatesError
                mapServerErrorsToForm<LoginFormData>({
                    errors: response.errors ?? null,
                    setError: setError,
                    knownFields: ['email', 'password'],
                    fieldMap: FIELD_MAP,
                    defaultMessage: 'Неверные учётные данные'
                })
            }

        } catch (err: unknown) {
            // HTTP/сетевая ошибка
            const errorData = (err as { data?: unknown })?.data

            mapServerPayloadErrorsToForm<LoginFormData>(
                errorData,
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
        <div className={styles.loginContainer}>
            <Logo width={200} height={100}/>

            <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                <div>
                    <input
                        className={styles.email}
                        placeholder="Email"
                        {...register(nameof<LoginFormData>('email'))}
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
                    className={styles.buttonSend}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Входим...' : 'Войти'}
                </button>

                <div className={styles.errorsContainer}>
                    {errors.root && (
                        <p className="text-red-500 text-sm">{errors.root.message as string}</p>
                    )}
                </div>
            </form>
        </div>
    )
}

export default LoginPage