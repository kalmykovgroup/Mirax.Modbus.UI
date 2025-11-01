import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import styles from './ExecutionHistoryModal.module.css';
import type { AppDispatch, RootState } from '@/baseStore/store.ts';
import {
    closeExecutionHistoryModal,
    selectExecution,
    setStatusFilter,
    selectModalState,
    selectExecutionsFiltered,
    selectSelectedExecution,
    upsertExecution,
} from '@scenario/store/executionHistorySlice.ts';
import {
    useGetExecutionHistoryByScenarioIdQuery,
    useGetAllExecutionHistoryQuery,
    useGetRecoveryLogsByScenarioIdQuery,
} from '@scenario/shared/api/scenarioExecutionHistoryApi.ts';
import { ScenarioExecutionStatus } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioExecutionStatus.ts';
import { RecoveryResult } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/RecoveryResult.ts';
import type {ScenarioExecutionHistoryDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioExecutionHistoryDto.ts";
import type {ScenarioRecoveryLogDto} from "@scenario/shared/contracts/server/remoteServerDtos/ScenarioExecutionHistoryDtos/ScenarioRecoveryLogDto.ts";

// Утилиты для форматирования
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function formatDuration(startedAt: string, completedAt: string | null): string {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const durationMs = end - start;

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}ч ${minutes % 60}м`;
    }
    if (minutes > 0) {
        return `${minutes}м ${seconds % 60}с`;
    }
    return `${seconds}с`;
}

function getStatusText(status: ScenarioExecutionStatus): string {
    const statusMap = {
        [ScenarioExecutionStatus.Running]: 'Выполняется',
        [ScenarioExecutionStatus.Completed]: 'Завершен',
        [ScenarioExecutionStatus.Failed]: 'Ошибка',
        [ScenarioExecutionStatus.Terminated]: 'Остановлен',
        [ScenarioExecutionStatus.Canceled]: 'Отменен',
        [ScenarioExecutionStatus.TimedOut]: 'Таймаут',
        [ScenarioExecutionStatus.Paused]: 'Приостановлен',
    };
    return statusMap[status] ?? 'Неизвестно';
}

function getRecoveryResultText(result: RecoveryResult): string {
    const resultMap = {
        [RecoveryResult.SuccessfullyRestored]: 'Успешно восстановлено',
        [RecoveryResult.PartiallyRestored]: 'Частично восстановлено',
        [RecoveryResult.WorkflowNotFound]: 'Workflow не найден',
        [RecoveryResult.WorkflowCompleted]: 'Workflow завершен',
        [RecoveryResult.WorkflowFailed]: 'Workflow завершился с ошибкой',
        [RecoveryResult.WorkflowCanceled]: 'Workflow отменен',
        [RecoveryResult.WorkflowTerminated]: 'Workflow остановлен',
        [RecoveryResult.RecoveryError]: 'Ошибка восстановления',
    };
    return resultMap[result] ?? 'Неизвестно';
}

function getRecoveryResultClassName(result: RecoveryResult): string {
    const classMap = {
        [RecoveryResult.SuccessfullyRestored]: styles.recoverySuccess,
        [RecoveryResult.PartiallyRestored]: styles.recoveryPartial,
        [RecoveryResult.WorkflowNotFound]: styles.recoveryError,
        [RecoveryResult.WorkflowCompleted]: styles.recoveryInfo,
        [RecoveryResult.WorkflowFailed]: styles.recoveryError,
        [RecoveryResult.WorkflowCanceled]: styles.recoveryWarning,
        [RecoveryResult.WorkflowTerminated]: styles.recoveryWarning,
        [RecoveryResult.RecoveryError]: styles.recoveryError,
    };
    return classMap[result] ?? styles.recoveryInfo;
}

function getStatusClassName(status: ScenarioExecutionStatus): string {
    const classMap = {
        [ScenarioExecutionStatus.Running]: styles.executionStatus_Running,
        [ScenarioExecutionStatus.Completed]: styles.executionStatus_Completed,
        [ScenarioExecutionStatus.Failed]: styles.executionStatus_Failed,
        [ScenarioExecutionStatus.Terminated]: styles.executionStatus_Terminated,
        [ScenarioExecutionStatus.Canceled]: styles.executionStatus_Canceled,
        [ScenarioExecutionStatus.TimedOut]: styles.executionStatus_TimedOut,
        [ScenarioExecutionStatus.Paused]: styles.executionStatus_Paused,
    };
    return classMap[status] ?? '';
}

// Компонент элемента списка
interface ExecutionItemProps {
    execution: ScenarioExecutionHistoryDto;
    isSelected: boolean;
    onSelect: () => void;
}

function ExecutionItem({ execution, isSelected, onSelect }: ExecutionItemProps) {
    const statusClass = getStatusClassName(execution.status);

    return (
        <div
            className={`${styles.executionItem} ${isSelected ? styles.executionItemActive : ''}`}
            onClick={onSelect}
        >
            <div className={styles.executionItemHeader}>
                <span className={`${styles.executionStatus} ${statusClass}`}>
                    {getStatusText(execution.status)}
                </span>
                <span className={styles.executionTime}>
                    {formatDate(execution.startedAt)}
                </span>
            </div>

            <div className={styles.executionInfo}>
                <span className={styles.executionWorkflowId}>
                    {execution.workflowId.substring(0, 24)}...
                </span>
                <span className={styles.executionDuration}>
                    Длительность: {formatDuration(execution.startedAt, execution.completedAt)}
                </span>
            </div>
        </div>
    );
}

// Компонент деталей выполнения
interface ExecutionDetailsProps {
    execution: ScenarioExecutionHistoryDto;
    recoveryLogs: ScenarioRecoveryLogDto[];
}

function ExecutionDetails({ execution, recoveryLogs }: ExecutionDetailsProps) {
    return (
        <div className={styles.detailsContent}>
            {/* Основная информация */}
            <div className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Основная информация</h3>
                <div className={styles.detailsGrid}>
                    <span className={styles.detailLabel}>Статус:</span>
                    <span className={styles.detailValue}>{getStatusText(execution.status)}</span>

                    <span className={styles.detailLabel}>Workflow ID:</span>
                    <span className={styles.detailValue}>{execution.workflowId}</span>

                    <span className={styles.detailLabel}>Scenario ID:</span>
                    <span className={styles.detailValue}>{execution.scenarioId}</span>

                    <span className={styles.detailLabel}>Начало:</span>
                    <span className={styles.detailValue}>{formatDate(execution.startedAt)}</span>

                    {execution.completedAt && (
                        <>
                            <span className={styles.detailLabel}>Завершение:</span>
                            <span className={styles.detailValue}>{formatDate(execution.completedAt)}</span>
                        </>
                    )}

                    <span className={styles.detailLabel}>Длительность:</span>
                    <span className={styles.detailValue}>
                        {formatDuration(execution.startedAt, execution.completedAt)}
                    </span>

                    {execution.temporalStatus && (
                        <>
                            <span className={styles.detailLabel}>Temporal Status:</span>
                            <span className={styles.detailValue}>{execution.temporalStatus}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Ошибки */}
            {execution.errorMessage && (
                <div className={styles.detailsSection}>
                    <h3 className={styles.sectionTitle}>Информация об ошибке</h3>
                    <div className={styles.errorBox}>
                        <div className={styles.errorMessage}>{execution.errorMessage}</div>
                        {execution.errorDetails && (
                            <div className={styles.errorDetails}>{execution.errorDetails}</div>
                        )}
                    </div>
                </div>
            )}

            {/* Логи восстановления */}
            {recoveryLogs.length > 0 && (
                <div className={styles.detailsSection}>
                    <h3 className={styles.sectionTitle}>История восстановления ({recoveryLogs.length})</h3>
                    <div className={styles.recoveryLogsList}>
                        {recoveryLogs.map((log) => (
                            <div key={log.id} className={styles.recoveryLogItem}>
                                <div className={styles.recoveryLogHeader}>
                                    <span className={`${styles.recoveryResultBadge} ${getRecoveryResultClassName(log.result)}`}>
                                        {getRecoveryResultText(log.result)}
                                    </span>
                                    <span className={styles.recoveryLogDate}>
                                        {formatDate(log.recoveryAttemptAt)}
                                    </span>
                                </div>

                                {log.description && (
                                    <div className={styles.recoveryLogDescription}>{log.description}</div>
                                )}

                                <div className={styles.recoveryLogDetails}>
                                    {log.statusBeforeRecovery !== null && (
                                        <div className={styles.recoveryLogDetailRow}>
                                            <span className={styles.recoveryLogDetailLabel}>Статус до:</span>
                                            <span className={styles.recoveryLogDetailValue}>
                                                {getStatusText(log.statusBeforeRecovery)}
                                            </span>
                                        </div>
                                    )}

                                    {log.statusAfterRecovery !== null && (
                                        <div className={styles.recoveryLogDetailRow}>
                                            <span className={styles.recoveryLogDetailLabel}>Статус после:</span>
                                            <span className={styles.recoveryLogDetailValue}>
                                                {getStatusText(log.statusAfterRecovery)}
                                            </span>
                                        </div>
                                    )}

                                    {log.comPortsRestored && (
                                        <div className={styles.recoveryLogDetailRow}>
                                            <span className={styles.recoveryLogDetailLabel}>COM-порты:</span>
                                            <span className={styles.recoveryLogDetailValue}>
                                                Восстановлено {log.restoredComPortsCount} портов
                                            </span>
                                        </div>
                                    )}

                                    {log.temporalStatus && (
                                        <div className={styles.recoveryLogDetailRow}>
                                            <span className={styles.recoveryLogDetailLabel}>Temporal Status:</span>
                                            <span className={styles.recoveryLogDetailValue}>{log.temporalStatus}</span>
                                        </div>
                                    )}
                                </div>

                                {log.errorMessage && (
                                    <div className={styles.recoveryLogError}>
                                        <div className={styles.recoveryLogErrorMessage}>{log.errorMessage}</div>
                                        {log.errorDetails && (
                                            <div className={styles.recoveryLogErrorDetails}>{log.errorDetails}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Основной компонент модального окна
export function ExecutionHistoryModal() {
    const dispatch = useDispatch<AppDispatch>();
    const modalState = useSelector(selectModalState);
    const filteredExecutions = useSelector(selectExecutionsFiltered);
    const selectedExecution = useSelector(selectSelectedExecution);

    const { selectedScenarioId, statusFilter, isOpen } = modalState;

    // Загрузка данных
    const { data: allExecutions } = useGetAllExecutionHistoryQuery(undefined, {
        skip: !isOpen || !!selectedScenarioId,
        pollingInterval: 10000, // Обновляем каждые 10 секунд
    });

    const { data: scenarioExecutions } = useGetExecutionHistoryByScenarioIdQuery(
        { scenarioId: selectedScenarioId!, status: statusFilter === 'all' ? undefined : statusFilter },
        {
            skip: !isOpen || !selectedScenarioId,
            pollingInterval: 10000,
        }
    );

    // Загрузка логов восстановления для выбранного выполнения
    const { data: recoveryLogs = [] } = useGetRecoveryLogsByScenarioIdQuery(
        { scenarioId: selectedExecution?.scenarioId! },
        {
            skip: !isOpen || !selectedExecution?.scenarioId,
            pollingInterval: 10000,
        }
    );

    // Синхронизация данных с store
    useEffect(() => {
        const executions = selectedScenarioId ? scenarioExecutions : allExecutions;
        if (executions) {
            executions.forEach(execution => {
                dispatch(upsertExecution(execution));
            });
        }
    }, [allExecutions, scenarioExecutions, selectedScenarioId, dispatch]);

    const handleClose = useCallback(() => {
        dispatch(closeExecutionHistoryModal());
    }, [dispatch]);

    const handleSelectExecution = useCallback(
        (executionId: string) => {
            dispatch(selectExecution({ executionId }));
        },
        [dispatch]
    );

    const handleStatusFilterChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value;
            dispatch(setStatusFilter(value === 'all' ? 'all' : parseInt(value) as ScenarioExecutionStatus));
        },
        [dispatch]
    );

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>
                        История выполнения {selectedScenarioId ? 'сценария' : 'всех сценариев'}
                    </h2>
                    <button className={styles.modalClose} onClick={handleClose} title="Закрыть">
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Левая панель - список запусков */}
                    <div className={styles.sidebar}>
                        <div className={styles.filterSection}>
                            <label className={styles.filterLabel} htmlFor="statusFilter">
                                Фильтр по статусу
                            </label>
                            <select
                                id="statusFilter"
                                className={styles.filterSelect}
                                value={statusFilter === 'all' ? 'all' : statusFilter}
                                onChange={handleStatusFilterChange}
                            >
                                <option value="all">Все статусы</option>
                                <option value={ScenarioExecutionStatus.Running}>Выполняется</option>
                                <option value={ScenarioExecutionStatus.Completed}>Завершен</option>
                                <option value={ScenarioExecutionStatus.Failed}>Ошибка</option>
                                <option value={ScenarioExecutionStatus.Terminated}>Остановлен</option>
                                <option value={ScenarioExecutionStatus.Canceled}>Отменен</option>
                                <option value={ScenarioExecutionStatus.TimedOut}>Таймаут</option>
                                <option value={ScenarioExecutionStatus.Paused}>Приостановлен</option>
                            </select>
                        </div>

                        <div className={styles.executionsList}>
                            {filteredExecutions.length === 0 ? (
                                <div className={styles.emptyState}>
                                    Нет записей для отображения
                                </div>
                            ) : (
                                filteredExecutions.map((execution) => (
                                    <ExecutionItem
                                        key={execution.id}
                                        execution={execution}
                                        isSelected={selectedExecution?.id === execution.id}
                                        onSelect={() => handleSelectExecution(execution.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Правая панель - детали */}
                    <div className={styles.detailsPanel}>
                        {selectedExecution ? (
                            <ExecutionDetails execution={selectedExecution} recoveryLogs={recoveryLogs} />
                        ) : (
                            <div className={styles.noSelection}>
                                Выберите запуск из списка для просмотра деталей
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
