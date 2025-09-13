import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type {JSX} from "react";
import {ROUTES} from "@app/constants/routes.ts";
import {selectIsAuthenticated} from "@login/store/authSlice.ts";

interface Props {
    children: JSX.Element
}

/**
 * Компонент защищённого маршрута.
 * Проверяет авторизацию и, если пользователь не авторизован, перенаправляет на страницу логина.
 * Используется для оборачивания защищённых маршрутов внутри AppRouter.
 */
const ProtectedRoute = ({ children }: Props) => {
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const location = useLocation()

    if (!isAuthenticated) {
        // Перенаправляем на страницу логина, сохраняя откуда пришли
        return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />
    }

    return children
}

export default ProtectedRoute