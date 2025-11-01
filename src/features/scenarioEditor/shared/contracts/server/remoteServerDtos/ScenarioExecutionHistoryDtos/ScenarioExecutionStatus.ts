/**
 * Статус выполнения сценария
 */
export enum ScenarioExecutionStatus {
    /**
     * Выполняется
     */
    Running = 0,

    /**
     * Успешно завершен
     */
    Completed = 1,

    /**
     * Завершен с ошибкой
     */
    Failed = 2,

    /**
     * Принудительно остановлен (terminated)
     */
    Terminated = 3,

    /**
     * Отменен пользователем
     */
    Canceled = 4,

    /**
     * Тайм-аут
     */
    TimedOut = 5,

    /**
     * Приостановлен
     */
    Paused = 6
}
