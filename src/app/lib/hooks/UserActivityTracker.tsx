import { useEffect } from 'react';
import { debounce } from "lodash";
import {useAppDispatch} from "@/store/hooks.ts";
import {useSelector} from "react-redux";
import {selectLastActive, updateLastActive} from "@/features/user/store/userSlice.ts";
import {resetAuthState, selectIsAuthenticated} from "@login/store/authSlice.ts";


const IDLE_TIMEOUT_MINUTES = 10;
const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000;

export const UserActivityTracker = () => {
    const dispatch = useAppDispatch();
    const lastActive = useSelector(selectLastActive);
    const isAuthenticated = useSelector(selectIsAuthenticated);

    useEffect(() => {
        // Создаём debounced версию функции updateActivity
        const debouncedUpdate = debounce(() => {
            dispatch(updateLastActive());
        }, 1000); // Диспатчим не чаще, чем раз в 1000 мс

        const events = ['mousemove', 'keydown', 'click', 'scroll'];
        events.forEach((event) => window.addEventListener(event, debouncedUpdate));

        return () => {
            events.forEach((event) => window.removeEventListener(event, debouncedUpdate));
            debouncedUpdate.cancel(); // Очищаем debounce при размонтировании
        };
    }, [dispatch]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(() => {
            if (!lastActive) return;
            const now = Date.now();
            if (now - lastActive > IDLE_TIMEOUT_MS) {
                dispatch(resetAuthState());
            }
        }, 60 * 1000); // Проверяем каждую минуту

        return () => clearInterval(interval);
    }, [lastActive, dispatch, isAuthenticated]);

    return null;
};