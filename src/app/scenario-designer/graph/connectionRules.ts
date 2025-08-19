// src/app/scenario-designer/graph/connectionRules.ts
import { FlowType } from '@app/scenario-designer/types/FlowType'; // ВАЖНО: не import type!

type Rules = Partial<Record<FlowType, ReadonlySet<FlowType>>>;

/** Источник → допустимые цели */
export const ALLOW_MAP: Rules = {
    // jump ->
    [FlowType.jumpStepNode]: new Set<FlowType>([
        FlowType.delayStepNode,
        FlowType.parallelStepNode,
        FlowType.branchNode,
        FlowType.conditionStepNode,
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
    ]),

    // condition ->
    [FlowType.conditionStepNode]: new Set<FlowType>([
        FlowType.conditionStepNode,
        FlowType.branchNode,
        FlowType.jumpStepNode,
        FlowType.delayStepNode,
        FlowType.parallelStepNode,
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
    ]),

    // condition ->
    [FlowType.parallelStepNode]: new Set<FlowType>([
        FlowType.branchNode,
    ]),

    // system ->
    [FlowType.activitySystemNode]: new Set<FlowType>([
        FlowType.activitySystemNode,
        FlowType.activityModbusNode,
    ]),


    // signal ->
    [FlowType.signalNode]: new Set<FlowType>([
        FlowType.signalNode,
    ]),

    // при необходимости добавляй остальные источники
} as const;

/** Цель ← допустимые источники (строим автоматически из ALLOW_MAP) */
export const TARGET_ALLOW_MAP: Rules = (() => {
    const res: Partial<Record<FlowType, Set<FlowType>>> = {};
    (Object.keys(ALLOW_MAP) as FlowType[]).forEach((src) => {
        const targets = ALLOW_MAP[src]!;
        targets.forEach((tgt) => {
            if (!res[tgt]) res[tgt] = new Set<FlowType>();
            res[tgt]!.add(src);
        });
    });
    // приводим к ReadonlySet в типах
    return res as Rules;
})();

/** Утилиты (по желанию) */
export const canConnect = (src?: FlowType, tgt?: FlowType) =>
    !!(src && tgt && ALLOW_MAP[src]?.has(tgt));

export const canAccept = (tgt?: FlowType, src?: FlowType) =>
    !!(tgt && src && TARGET_ALLOW_MAP[tgt]?.has(src));
