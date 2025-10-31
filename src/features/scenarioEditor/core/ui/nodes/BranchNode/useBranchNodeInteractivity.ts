import {useReactFlow} from "@xyflow/react";
import {useEffect, useRef} from "react";
import {FlowType} from "@scenario/core/types/flowType.ts";
import {ctrlKeyStore} from "@app/lib/hooks/ctrlKeyStore.ts";

/**
 * Оптимизированный хук для управления интерактивностью BranchNode
 *
 * Оптимизации:
 * 1. Кэшируем предыдущее состояние Ctrl через useRef
 * 2. Пропускаем setNodes если состояние не изменилось
 * 3. Не пересоздаём объекты нод если значения не изменились
 * 4. Ранний выход если нет BranchNode в графе
 */
export function useBranchNodeInteractivity() {
    const { setNodes } = useReactFlow();
    const prevCtrlStateRef = useRef<boolean | null>(null);

    // Основная функция обновления - БЕЗ useCallback чтобы избежать проблем
    const updateBranchNodeInteractivity = (isCtrlPressed: boolean) => {
        // Пропускаем обновление если состояние не изменилось
        if (prevCtrlStateRef.current === isCtrlPressed) {
            return;
        }
        prevCtrlStateRef.current = isCtrlPressed;

        setNodes((nodes) => {
            // Быстрая проверка: есть ли вообще BranchNode в графе
            const hasBranchNodes = nodes.some((node) => node.type === FlowType.BranchNode);
            if (!hasBranchNodes) {
                return nodes;
            }

            // Обновляем только BranchNode
            return nodes.map((node) => {
                if (node.type !== FlowType.BranchNode) {
                    return node;
                }

                // Проверяем изменились ли значения перед обновлением
                const willChange =
                    node.draggable !== isCtrlPressed ||
                    node.selectable !== isCtrlPressed ||
                    (isCtrlPressed === false && node.selected === true);

                if (!willChange) {
                    return node; // Ничего не изменилось, возвращаем тот же объект
                }

                // Создаём новый объект только если что-то действительно изменилось
                return {
                    ...node,
                    draggable: isCtrlPressed,
                    selectable: isCtrlPressed,
                    selected: isCtrlPressed ? node.selected : false,
                };
            });
        });
    };

    useEffect(() => {
        // Инициализируем начальное состояние
        const isPressed = ctrlKeyStore.get();
        prevCtrlStateRef.current = isPressed;
        updateBranchNodeInteractivity(isPressed);

        // Подписываемся на изменения состояния Ctrl
        const unsubscribe = ctrlKeyStore.subscribe((isPressed) => {
            updateBranchNodeInteractivity(isPressed);
        });

        // Гарантированная очистка подписки
        return () => {
            unsubscribe();
        };
    }, [setNodes]); // setNodes стабилен от useReactFlow
}