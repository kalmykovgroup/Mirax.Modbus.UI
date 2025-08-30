export interface StepRelationDto {
    id: string;
    parentStepId: string;
    childStepId: string;
    /**
     * Для step типа condition:
     * Условие, при котором срабатывает этот переход.
     * Если null или пустая строка — это дефолтное значение.
     */
    conditionExpression?: string | null;
    /**
     * Порядок проверки переходов: чем меньше, тем выше приоритет.
     */
    conditionOrder: number;
}

// ——— фабрика ———
const genId = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

export const StepRelationDto = {
    create(p: {
        id: string,
        parentStepId: string;
        childStepId: string;
        conditionExpression?: string | null;
        conditionOrder?: number;
    }): StepRelationDto {
        return {
            id: p.id ?? genId(),
            parentStepId: p.parentStepId,
            childStepId: p.childStepId,
            conditionExpression: p.conditionExpression ?? null,
            conditionOrder: p.conditionOrder ?? 0,
        };
    },
} as const;