/**
 * Результат попытки восстановления сценария
 */
export enum RecoveryResult {
    /**
     * Успешно восстановлен (workflow Running, порты восстановлены)
     */
    SuccessfullyRestored = 0,

    /**
     * Частично восстановлен (workflow Running, но проблемы с портами)
     */
    PartiallyRestored = 1,

    /**
     * Workflow не найден в Temporal
     */
    WorkflowNotFound = 2,

    /**
     * Workflow успешно завершен
     */
    WorkflowCompleted = 3,

    /**
     * Workflow завершился с ошибкой
     */
    WorkflowFailed = 4,

    /**
     * Workflow был отменен
     */
    WorkflowCanceled = 5,

    /**
     * Workflow был принудительно остановлен
     */
    WorkflowTerminated = 6,

    /**
     * Ошибка при попытке восстановления
     */
    RecoveryError = 7
}
