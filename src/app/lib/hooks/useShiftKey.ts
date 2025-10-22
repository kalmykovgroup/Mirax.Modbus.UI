// src/features/scenarioEditor/core/ui/hooks/useShiftKey.ts
import { useEffect, useState } from 'react';

/**
 * Глобальное отслеживание нажатия клавиши Shift
 * Используется для координации между нодами и обработчиками drag
 */
export function useShiftKey(): boolean {
    const [isShiftPressed, setIsShiftPressed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Shift' && !e.repeat) {
                setIsShiftPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent): void => {
            if (e.key === 'Shift') {
                setIsShiftPressed(false);
            }
        };

        // Сброс при потере фокуса (важно!)
        const handleBlur = (): void => {
            setIsShiftPressed(false);
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

    return isShiftPressed;
}