// только данные, лежащие в node.shared (без hover/over)


import type {ConnectContext} from "@/features/scenarioEditor/shared/contracts/models/ConnectContext.ts";

export type StepNodeData<T> = {
    /** Бизнес-объект (DTO из БД) */
    object: T;

    /** Контекст drag-соединения (для подсветки хендлов) */
    connectContext?: ConnectContext;

    /** Координата X в абсолютных единицах графа (для UI-отображения) */
    x: number;

    /** Координата Y в абсолютных единицах графа (для UI-отображения) */
    y: number;

    /** Для BranchNode: подсветка цели дропа при drag-and-drop */
    isDropTarget?: boolean;

    /**
     * ФЛАГ ПЕРСИСТЕНТНОСТИ
     *
     * Показывает, существует ли элемент в БД или только в UI.
     *
     * - `true`      → элемент загружен с сервера или уже сохранён в БД
     * - `false`     → элемент создан локально (drag-and-drop), но ещё не сохранён
     * - `undefined` → неизвестно (legacy-данные, старая логика без флага)
     *
     * ВАЖНО для правильного логирования изменений:
     * - CREATE → отправляем только при первом сохранении (false → true)
     * - UPDATE → отправляем только для персистентных (true)
     * - DELETE → отправляем только для персистентных (true)
     *
     * С учётом exactOptionalPropertyTypes:
     * - Поле может отсутствовать (отсутствие ключа в объекте)
     * - Поле может быть undefined явно (для совместимости)
     * - Поле может быть true/false
     */
    __persisted?: boolean | undefined;
};