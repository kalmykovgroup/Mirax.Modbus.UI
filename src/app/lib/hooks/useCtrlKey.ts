// useCtrlKey.ts

import { useEffect, useState } from 'react';

export function useCtrlKey(): boolean {
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if ((e.key === 'Control' || e.key === 'Meta') && !e.repeat) {
                setIsCtrlPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent): void => {
            if (e.key === 'Control' || e.key === 'Meta') {
                setIsCtrlPressed(false);
            }
        };

        const handleBlur = (): void => {
            setIsCtrlPressed(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    return isCtrlPressed;
}