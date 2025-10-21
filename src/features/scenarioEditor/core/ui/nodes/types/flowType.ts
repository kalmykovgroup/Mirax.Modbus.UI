import {StepType} from "@scenario/shared/contracts/server/types/Api.Shared/StepType.ts";

export type FlowType = StepType | 'BranchNode';

/**
 * Константы для удобства
 */
export const FlowType = {
    // Шаги (из StepType enum)
    ActivitySystem: StepType.ActivitySystem,
    ActivityModbus: StepType.ActivityModbus,
    Delay: StepType.Delay,
    Condition: StepType.Condition,
    Parallel: StepType.Parallel,
    Signal: StepType.Signal,
    Jump: StepType.Jump,

    // Дополнительный тип для ветки
    BranchNode: 'BranchNode' as const,
} as const;

/**
 * Type guard: является ли FlowType шагом (а не веткой)
 */
export function isStepFlowType(type: FlowType): type is StepType {
    return type !== FlowType.BranchNode;
}