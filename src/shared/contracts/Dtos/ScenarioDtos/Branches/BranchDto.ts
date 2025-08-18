import type {StepBaseDto} from "@shared/contracts/Dtos/ScenarioDtos/Steps/StepBaseDto.ts";

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
}
