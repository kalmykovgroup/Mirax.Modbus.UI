import { Guid } from "@app/lib/types/Guid.ts";
import EdgePathType from "@scenario/core/types/EdgePathType";

export interface StepRelationDto {
    id: Guid;
    parentStepId: Guid;
    childStepId: Guid;
    /**
     * Для step типа condition:
     * Условие, при котором срабатывает этот переход.
     * Если null или пустая строка — это дефолтное значение.
     */
    conditionExpression?: string | undefined;
    /**
     * Порядок проверки переходов: чем меньше, тем выше приоритет.
     */
    conditionOrder: number;

   sourceHandle: string;
   targetHandle: string;

   /**
    * Тип визуального пути связи (плавная, прямая, с углами и т.д.)
    */
   edgePathType: EdgePathType;
}


export const StepRelationDto = {
    create(p: {
        id: Guid,
        parentStepId: string;
        childStepId: string;
        conditionExpression?: string | undefined;
        conditionOrder?: number | undefined;
        sourceHandle: string;
        targetHandle: string;
        edgePathType: EdgePathType;
    }): StepRelationDto {
        return {
            id: p.id ?? Guid.NewGuid(),
            parentStepId: p.parentStepId,
            childStepId: p.childStepId,
            conditionExpression: p.conditionExpression,
            conditionOrder: p.conditionOrder ?? 0,
            sourceHandle: p.sourceHandle,
            targetHandle: p.targetHandle,
            edgePathType: p.edgePathType,
        } as StepRelationDto;
    },
} as const;