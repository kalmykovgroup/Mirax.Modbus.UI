// src/app/scenario-designer/graph/isValidConnection.ts
import type { Connection, IsValidConnection } from '@xyflow/react';
import type {FlowEdge} from "@/features/scenarioEditor/shared/contracts/models/FlowNode.ts";
import type {FlowType} from "@scenario/core/types/flowType.ts";

type Rules = Partial<Record<FlowType, ReadonlySet<FlowType>>>;

type Cfg = {
    /** тип ноды по id */
    getNodeType: (id: string) => FlowType | undefined;
    /** вернуть актуальный список рёбер (без stale) */
    getEdges: () => FlowEdge[];
    /** Источник -> допустимые цели */
    allowMap: Rules;
    /** Цель <- допустимые источники */
    targetAllowMap: Rules;
};

/**
 * Правила:
 *  - проверяем allowMap / targetAllowMap
 *  - запрещаем self-loop
 *  - запрещаем дубликаты по ПАРЕ НОД (A->B); direction учитывается, handle’ы игнорируем
 *  - цикл A->B и B->A допустим
 */
export function createIsValidConnection({
                                            getNodeType,
                                            getEdges,
                                            allowMap,
                                            targetAllowMap,
                                        }: Cfg): IsValidConnection<FlowEdge> {
    return (edgeOrConn: Connection | FlowEdge): boolean => {
        const source =
            (edgeOrConn as Connection).source ??
            (edgeOrConn as FlowEdge).source ??
            null;
        const target =
            (edgeOrConn as Connection).target ??
            (edgeOrConn as FlowEdge).target ??
            null;

        if (!source || !target) return false;
        if (source === target) return false; // self-loop

        const srcType = getNodeType(source);
        const tgtType = getNodeType(target);
        if (!srcType || !tgtType) return false;

        // матрицы допуска
        if (!allowMap[srcType]?.has(tgtType)) return false;
        if (!targetAllowMap[tgtType]?.has(srcType)) return false;

        const edges = getEdges();

        // запрет дублирующего направленного A->B (handle’ы игнорируем)
        const duplicate = edges.some((e) => e.source === source && e.target === target);
        if (duplicate) return false;

        // обратное направление (B->A) разрешено
        return true;
    };
}
