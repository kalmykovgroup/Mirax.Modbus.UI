import { ScenarioExecutionStatus } from './ScenarioExecutionStatus';

/**
 * История запуска сценария
 */
export interface ScenarioExecutionHistoryDto {
    /**
     * ID записи истории
     */
    id: string;

    /**
     * ID сценария
     */
    scenarioId: string;

    /**
     * ID Temporal workflow
     */
    workflowId: string;

    /**
     * Время начала выполнения
     */
    startedAt: string;

    /**
     * Время завершения выполнения (может быть null если еще выполняется)
     */
    completedAt: string | null;

    /**
     * Статус выполнения (Running, Completed, Failed, Terminated, Canceled)
     */
    status: ScenarioExecutionStatus;

    /**
     * Сообщение об ошибке (если есть)
     */
    errorMessage: string | null;

    /**
     * Детали ошибки / stack trace
     */
    errorDetails: string | null;

    /**
     * Статус Temporal workflow на момент записи
     */
    temporalStatus: string | null;
}
