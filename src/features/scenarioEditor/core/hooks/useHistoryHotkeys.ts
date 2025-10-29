// src/features/scenarioEditor/core/hooks/useHistoryHotkeys.ts

import { useEffect, useRef } from 'react';

export interface HistoryHotkeysCallbacks {
    onUndo?: () => void;
    onRedo?: () => void;
}

/**
 * Хук для обработки горячих клавиш истории (Undo/Redo)
 *
 * Использует e.code для независимости от раскладки клавиатуры
 * Использует useRef для стабилизации зависимостей и предотвращения лишних перерегистраций
 *
 * Поддерживаемые комбинации:
 * - Ctrl+Z (Cmd+Z на Mac) - Undo
 * - Ctrl+Shift+Z (Cmd+Shift+Z на Mac) - Redo
 * - Ctrl+Y (Cmd+Y на Mac) - Redo (альтернативная)
 *
 * @param callbacks - Колбэки для undo и redo
 * @param enabled - Включены ли горячие клавиши (по умолчанию true)
 */
export function useHistoryHotkeys(
    callbacks: HistoryHotkeysCallbacks,
    enabled: boolean = true
): void {
    // Используем useRef для хранения актуальных callbacks без перерегистрации обработчика
    const callbacksRef = useRef(callbacks);

    // Обновляем ref при каждом рендере, но это не триггерит useEffect
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            // Используем e.code для независимости от раскладки
            // KeyZ - физическая клавиша Z на QWERTY (Я на русской раскладке)
            // KeyY - физическая клавиша Y на QWERTY (Н на русской раскладке)

            // Ctrl+Z (без Shift) - Undo
            if (isCtrlOrCmd && e.code === 'KeyZ' && !e.shiftKey) {
                e.preventDefault();
                console.log('[useHistoryHotkeys] Ctrl+Z pressed - calling onUndo');
                callbacksRef.current.onUndo?.();
                return;
            }

            // Ctrl+Shift+Z - Redo
            if (isCtrlOrCmd && e.code === 'KeyZ' && e.shiftKey) {
                e.preventDefault();
                console.log('[useHistoryHotkeys] Ctrl+Shift+Z pressed - calling onRedo');
                callbacksRef.current.onRedo?.();
                return;
            }

            // Ctrl+Y - Redo (альтернативная)
            if (isCtrlOrCmd && e.code === 'KeyY') {
                e.preventDefault();
                console.log('[useHistoryHotkeys] Ctrl+Y pressed - calling onRedo');
                callbacksRef.current.onRedo?.();
                return;
            }
        };

        console.log('[useHistoryHotkeys] Registering history hotkeys (once per enabled state)');
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            console.log('[useHistoryHotkeys] Unregistering history hotkeys');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled]); // Теперь зависит только от enabled!
}
