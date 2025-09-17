import {Routes, Route} from "react-router-dom";

import React from "react";
import MainLayout from "@ui/layouts/MainLayout/MainLayout.tsx";
import {ROUTES} from "@app/constants/routes.ts";
import LoginPage from "@/features/login/ui/Login/LoginPage.tsx";
import {HomePage} from "@ui/pages/HomePage/HomePage.tsx";
import PageNotFound from "@ui/pages/PageNotFound/PageNotFound.tsx";
import ErrorPage from "@ui/pages/ErrorPage/ErrorPage.tsx";
import RouteLogger from "@app/providers/routing/RouteLogger.tsx";
import PublicRoute from "@app/providers/routing/PublicRoute.tsx";
import ProtectedRoute from "@app/providers/routing/ProtectedRoute.tsx";
import ChartsPage from "@charts/ui/ChartsPage.tsx";



const AppRouter: React.FC = () => {

    return (
        <>
            <RouteLogger/>
            <Routes>
                {/* Незащищённый маршрут логина */}


                <Route
                    path={ROUTES.LOGIN}
                    element={
                        /**
                         * PublicRoute запрещает доступ к страницам (например, login), если пользователь уже авторизован.
                         */
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    }
                />

                {/* Защищённые маршруты */}

                <Route path={ROUTES.HOME} element={

                    /**
                     * Компонент защищённого маршрута.
                     * Проверяет авторизацию и, если пользователь не авторизован, перенаправляет на страницу логина.
                     * Используется для оборачивания защищённых маршрутов внутри AppRouter.
                     */

                        <MainLayout />

                }>

                    <Route path={ROUTES.CHARTS} element={
                        <ChartsPage/>
                    }/>

                    <Route
                        index
                        element={
                            <ProtectedRoute>
                                <HomePage />
                            </ProtectedRoute>
                        }
                    />

                    <Route path={ROUTES.ERROR_SCREEN} element={<ErrorPage/>} />

                </Route>


                {/* Если страница не найдена, редирект на Home */}
               <Route path={ROUTES.NOT_FOUND} element={<PageNotFound/>} />

            </Routes>
        </>
    );
};

export default AppRouter;

