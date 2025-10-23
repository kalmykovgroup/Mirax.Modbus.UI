import { useEffect } from 'react';
import { debounce } from 'lodash';
import { useSelector } from 'react-redux';
import { selectLastActive, updateLastActive } from '@/features/user/store/userSlice';
import { resetAuthState, selectIsAuthenticated } from '@login/store/authSlice';
import { ENV } from '@/env';
import {useAppDispatch} from "@/baseStore/hooks.ts";

/**
 * Компонент для отслеживания активности пользователя
 * и автоматического логаута при длительной неактивности
 *
 * Настройки берутся из .env:
 * - VITE_AUTO_LOGOUT_ENABLED - включение/выключение функции
 * - VITE_AUTO_LOGOUT_TIMEOUT_MINUTES - таймаут в минутах
 */
export const UserActivityTracker = (): null => {
    const dispatch = useAppDispatch();
    const lastActive = useSelector(selectLastActive);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    // Если автологаут отключён в конфиге — не делаем ничего
    const isAutoLogoutEnabled = ENV.AUTO_LOGOUT_ENABLED;
    const timeoutMinutes = ENV.AUTO_LOGOUT_TIMEOUT_MINUTES;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    useEffect(() => {
        // Если функция отключена — не подписываемся на события
        if (!isAutoLogoutEnabled) return;

        // Создаём debounced версию функции updateActivity
        // Обновляем timestamp не чаще чем раз в секунду
        const debouncedUpdate = debounce(() => {
            dispatch(updateLastActive());
        }, 1000);

        // События, которые считаются активностью
        const events = ['mousemove', 'keydown', 'click', 'scroll'] as const;

        events.forEach((event) => {
            window.addEventListener(event, debouncedUpdate);
        });

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, debouncedUpdate);
            });
            debouncedUpdate.cancel();
        };
    }, [dispatch, isAutoLogoutEnabled]);

    useEffect(() => {
        // Если функция отключена или пользователь не авторизован — ничего не делаем
        if (!isAutoLogoutEnabled || !isAuthenticated) return;

        // Проверяем время последней активности каждую минуту
        const interval = setInterval(() => {
            if (!lastActive) return;

            const now = Date.now();
            const timeSinceLastActivity = now - lastActive;

            // Если превышен таймаут — логаут
            if (timeSinceLastActivity > timeoutMs) {
                if (ENV.DEV) {
                    console.warn(
                        '[UserActivityTracker] Таймаут неактивности превышен:',
                        {
                            timeSinceLastActivity: Math.floor(timeSinceLastActivity / 1000 / 60),
                            timeoutMinutes,
                        }
                    );
                }

                dispatch(resetAuthState());
            }
        }, 60 * 1000); // Проверяем каждую минуту

        return () => clearInterval(interval);
    }, [lastActive, dispatch, isAuthenticated, isAutoLogoutEnabled, timeoutMs, timeoutMinutes]);
/*
    // Логируем состояние только в dev
    useEffect(() => {
        if (ENV.DEV) {
            console.log('[UserActivityTracker] Инициализирован:', {
                enabled: isAutoLogoutEnabled,
                timeoutMinutes,
                isAuthenticated,
            });
        }
    }, [isAutoLogoutEnabled, timeoutMinutes, isAuthenticated]);*/

    return null;
};