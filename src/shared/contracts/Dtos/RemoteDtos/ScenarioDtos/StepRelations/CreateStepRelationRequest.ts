import type {Guid} from "@app/lib/types/Guid.ts";

export interface CreateStepRelationRequest {
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
