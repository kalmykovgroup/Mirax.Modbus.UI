// src/features/scenarioEditor/shared/contracts/types/FlowType.ts
export const FlowType = {
    jumpStepNode: 'jumpStepNode',
    delayStepNode: 'delayStepNode',
    parallelStepNode: 'parallelStepNode',
    branchNode: 'branchNode',
    conditionStepNode: 'conditionStepNode',
    activitySystemNode: 'activitySystemNode',
    activityModbusNode: 'activityModbusNode',
    signalStepNode: 'signalStepNode',
} as const;

export type FlowType = typeof FlowType[keyof typeof FlowType];