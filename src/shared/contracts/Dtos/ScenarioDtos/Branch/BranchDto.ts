import type {StepBaseDto} from "@shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts";
import type {FlowNode} from "@app/scenario-designer/types/FlowNode.ts";
import {FlowType} from "@app/scenario-designer/types/FlowType.ts";

export interface BranchDto {
    id: string;
    scenarioId: string;
    name: string;
    description: string;
    /** Если параллельная ветка — ждать ли её завершения */
    waitForCompletion: boolean;
    /** Id родительского параллельного шага, если есть */
    parallelStepId?: string | null;
    /** Id родительского condition-шагa, если есть */
    conditionStepId?: string | null;
    /** Условие выполнения перехода */
    conditionExpression?: string | null;
    /** Приоритет проверки условия */
    conditionOrder: number;
    /** Список шагов внутри ветки */
    steps: StepBaseDto[];
    x: number;
    y: number;
    width: number,
    height: number,
}

// ——— «статические» фабричные методы рядом с интерфейсом ———
const genId = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

export const BranchDto = {
    /**
     * Создать ветку с дефолтами.
     * Обязателен только scenarioId. Остальное можно перекрыть через partial.
     */
    create(
        p: {
            id?: string;
            scenarioId: string;
            name?: string;
            description?: string;
            /** Если параллельная ветка — ждать ли её завершения */
            waitForCompletion?: boolean;
            /** Id родительского параллельного шага, если есть */
            parallelStepId?: string;
            /** Id родительского condition-шагa, если есть */
            conditionStepId?: string;
            /** Условие выполнения перехода */
            conditionExpression?: string;
            /** Приоритет проверки условия */
            conditionOrder?: number;
            /** Список шагов внутри ветки */
            steps?: StepBaseDto[];
            x?: number;
            y?: number;
            width?: number,
            height?: number,
        } & Partial<BranchDto>
    ): BranchDto {
        return {
            id: p.id ?? genId(),
            scenarioId: p.scenarioId,
            name: p.name ?? 'Новая ветка',
            description: p.description ?? '',
            waitForCompletion: p.waitForCompletion ?? false,
            parallelStepId: p.parallelStepId ?? null,
            conditionStepId: p.conditionStepId ?? null,
            conditionExpression: p.conditionExpression ?? null,
            conditionOrder: p.conditionOrder ?? 0,
            steps: p.steps ?? [],
            x: p.x ?? 0,
            y: p.y ?? 0,
            width: p.width ?? 70,
            height: p.height ?? 21,
        };
    },

   toFlowNode(b: BranchDto): FlowNode {
    return {
        id: b.id,
        type: FlowType.branchNode,
        position: { x: b.x ?? 0, y: b.y ?? 0 },
        data: { object: b },
        style: { width: b.width, height: b.height },
        draggable: true,
        selectable: true,
    };
}
} as const;



