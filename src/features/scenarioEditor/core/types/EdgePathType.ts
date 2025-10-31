
/**
 * Типы путей для связей (edges)
 * Определяет визуальный стиль линии соединения между нодами
 */
// @ts-ignore
enum EdgePathType {
    /**
     * Плавная ступенчатая линия с закругленными углами
     * Используется по умолчанию для большинства связей
     */
    SmoothStep = 'smoothstep',

    /**
     * Прямая линия без изгибов
     * Используется когда нужна максимальная прямота
     */
    Straight = 'straight',

    /**
     * Кривая Безье (плавная кривая)
     * Используется для jump-связей и когда нужна максимальная плавность
     */
    Bezier = 'bezier',

    /**
     * Простая кривая Безье (упрощенный вариант)
     * Используется когда нужна умеренная плавность
     */
    SimpleBezier = 'simplebezier',

    /**
     * Ступенчатая линия с прямыми углами (без закруглений)
     * Используется когда нужны четкие прямые углы
     */
    Step = 'step',
}

export default EdgePathType

/**
 * Метаданные для типов путей
 */
export const EdgePathTypeMeta = {
    [EdgePathType.SmoothStep]: {
        label: 'Плавные углы',
        description: 'Ступенчатая линия с закругленными углами',
        icon: '⤴',
    },
    [EdgePathType.Straight]: {
        label: 'Прямая',
        description: 'Прямая линия без изгибов',
        icon: '→',
    },
    [EdgePathType.Bezier]: {
        label: 'Гибкая',
        description: 'Плавная кривая Безье',
        icon: '↝',
    },
    [EdgePathType.SimpleBezier]: {
        label: 'Простая кривая',
        description: 'Упрощенная кривая Безье',
        icon: '⤷',
    },
    [EdgePathType.Step]: {
        label: 'Прямые углы',
        description: 'Ступенчатая линия с прямыми углами',
        icon: '⊏',
    },
} as const;

/**
 * Дефолтный тип пути для разных типов связей
 */
export const DefaultEdgePathType = {
    step: EdgePathType.SmoothStep,
    branchLink: EdgePathType.SmoothStep,
    jump: EdgePathType.Bezier,
} as const;
