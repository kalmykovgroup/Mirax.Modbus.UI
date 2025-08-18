import { useEffect, useState } from 'react';

/**
 * Хук отслеживает состояние соединения.
 * true  — онлайн
 * false — офлайн
 */
export const useOnlineStatus = () => {
    const [online, setOnline] = useState<boolean>(navigator.onLine);

    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);

        window.addEventListener('online', on);
        window.addEventListener('offline', off);

        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    return online;
};
