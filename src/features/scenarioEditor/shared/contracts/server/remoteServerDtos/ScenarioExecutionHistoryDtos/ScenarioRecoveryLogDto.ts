import { RecoveryResult } from './RecoveryResult';

/**
 * Лог попытки восстановления сценария
 */
export interface ScenarioRecoveryLogDto {
    /**
     * ID записи лога
     */
    id: string;

    /**
     * ID сценария
     */
    scenarioId: string;

    /**
     * ID записи истории выполнения (если есть)
     */
    scenarioExecutionHistoryId: string | null;

    /**
     * ID Temporal workflow
     */
    workflowId: string;

    /**
     * Время попытки восстановления
     */
    recoveryAttemptAt: string;

    /**
     * Результат попытки восстановления
     */
    result: RecoveryResult;

    /**
     * Статус workflow в Temporal на момент проверки
     */
    temporalStatus: string | null;

    /**
     * Статус сценария ДО попытки восстановления
     */
    statusBeforeRecovery: string | null;

    /**
     * Статус сценария ПОСЛЕ попытки восстановления
     */
    statusAfterRecovery: string | null;

    /**
     * Описание того, что произошло при восстановлении
     */
    description: string;

    /**
     * Сообщение об ошибке (если была ошибка при восстановлении)
     */
    errorMessage: string | null;

    /**
     * Детали ошибки
     */
    errorDetails: string | null;

    /**
     * Были ли восстановлены COM порты
     */
    comPortsRestored: boolean | null;

    /**
     * Количество восстановленных COM портов
     */
    restoredComPortsCount: number | null;

    createdAt: string;
    updatedAt: string;
}
