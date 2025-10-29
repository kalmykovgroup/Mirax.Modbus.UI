import { Guid } from "@app/lib/types/Guid.ts";

export interface StepRelationDto {
    id: Guid;
    parentStepId: Guid;
    childStepId: Guid;
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


export const StepRelationDto = {
    create(p: {
        id: Guid,
        parentStepId: string;
        childStepId: string;
        conditionExpression?: string | null;
        conditionOrder?: number;
    }): StepRelationDto {
        return {
            id: p.id ?? Guid.NewGuid(),
            parentStepId: p.parentStepId,
            childStepId: p.childStepId,
            conditionExpression: p.conditionExpression ?? null,
            conditionOrder: p.conditionOrder ?? 0,
        };
    },
} as const;