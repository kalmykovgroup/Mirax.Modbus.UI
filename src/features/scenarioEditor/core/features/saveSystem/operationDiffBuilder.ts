// src/features/scenarioEditor/core/features/saveSystem/operationDiffBuilder.ts

import type { HistoryRecord, EntitySnapshot, UpdateRecord } from '@scenario/core/features/historySystem/types';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto';
import { DbActionType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType';

/**
 * Результат построения diff для операции
 */
export interface OperationDiff {
    /** ID операции */
    opId: string;
    /** Тип операции */
    action: DbActionType;
    /** ID сущности */
    entityId: string;
    /** Тип сущности */
    entityType: string;
    /** Состояние "как было на сервере" (для Update/Delete) */
    before: EntitySnapshot | null;
    /** Состояние "как стало на клиенте" (для Create/Update) */
    after: EntitySnapshot | null;
    /** Метаданные (название, описание и т.д.) */
    metadata: {
        name?: string;
        description?: string;
    };
}

/**
 * Извлекает метаданные из payload для отображения
 */
function extractMetadata(payload: any): { name?: string; description?: string } {
    return {
        name: payload?.name || payload?.label || undefined,
        description: payload?.description || undefined,
    };
}

/**
 * Находит ПЕРВОЕ упоминание сущности в истории (для получения before состояния)
 */
function findFirstRecordForEntity(
    entityId: string,
    historyRecords: HistoryRecord[],
    startFromIndex: number
): HistoryRecord | null {
    // Рекурсивная функция для поиска в истории (включая батчи)
    function searchInRecords(records: HistoryRecord[]): HistoryRecord | null {
        for (const record of records) {
            if (record.type === 'batch') {
                // Ищем внутри батча
                const found = searchInRecords(record.records);
                if (found) return found;
            } else if (record.entityId === entityId) {
                return record;
            }
        }
        return null;
    }

    // Ищем начиная с startFromIndex
    const recordsToSearch = historyRecords.slice(startFromIndex);
    return searchInRecords(recordsToSearch);
}

/**
 * Находит ПОСЛЕДНЕЕ упоминание сущности в истории (для получения after состояния)
 */
function findLastRecordForEntity(
    entityId: string,
    historyRecords: HistoryRecord[],
    startFromIndex: number
): HistoryRecord | null {
    // Рекурсивная функция для поиска в истории (включая батчи)
    function searchInRecordsReverse(records: HistoryRecord[]): HistoryRecord | null {
        // Идем с конца для поиска последнего упоминания
        for (let i = records.length - 1; i >= 0; i--) {
            const record = records[i];

            if (record.type === 'batch') {
                // Ищем внутри батча
                const found = searchInRecordsReverse(record.records);
                if (found) return found;
            } else if (record.entityId === entityId) {
                return record;
            }
        }
        return null;
    }

    // Ищем начиная с startFromIndex до конца
    const recordsToSearch = historyRecords.slice(startFromIndex);
    return searchInRecordsReverse(recordsToSearch);
}

/**
 * Находит состояние сущности на момент lastSyncedIndex (состояние на сервере)
 * Это состояние которое было после последнего успешного сохранения
 */
function findServerStateForEntity(
    entityId: string,
    historyRecords: HistoryRecord[],
    lastSyncedIndex: number
): EntitySnapshot | null {
    // Если lastSyncedIndex = 0, значит ничего не было синхронизировано
    // В этом случае состояние на сервере - это изначальное состояние
    if (lastSyncedIndex === 0) {
        return null;
    }

    // Ищем последнее упоминание сущности в истории ДО lastSyncedIndex
    // Это будет состояние после последнего сохранения
    const syncedRecords = historyRecords.slice(0, lastSyncedIndex);

    function searchInRecordsReverse(records: HistoryRecord[]): EntitySnapshot | null {
        for (let i = records.length - 1; i >= 0; i--) {
            const record = records[i];

            if (record.type === 'batch') {
                const found = searchInRecordsReverse(record.records);
                if (found) return found;
            } else if (record.entityId === entityId) {
                // Нашли последнее упоминание - возвращаем after состояние
                if (record.type === 'create') {
                    return record.after;
                } else if (record.type === 'update') {
                    return record.after;
                } else if (record.type === 'delete') {
                    // Если сущность была удалена, то на сервере её нет
                    return null;
                }
            }
        }
        return null;
    }

    return searchInRecordsReverse(syncedRecords);
}

/**
 * Строит diff для операции на основе истории
 *
 * @param operation - Операция для которой строим diff
 * @param historyRecords - Полная история операций (history.past)
 * @param lastSyncedIndex - Индекс последней синхронизированной операции
 * @returns Diff с before/after состояниями
 */
export function buildOperationDiff(
    operation: ScenarioOperationDto,
    historyRecords: HistoryRecord[],
    lastSyncedIndex: number
): OperationDiff | null {
    const payload = operation.payload as any;
    const entityId = payload?.id;

    if (!entityId) {
        console.warn('[operationDiffBuilder] Operation without entityId:', operation);
        return null;
    }

    console.log('[operationDiffBuilder] Building diff for:', {
        entityId,
        action: operation.action,
        lastSyncedIndex,
        historyLength: historyRecords.length,
    });

    // Ищем записи истории для этой сущности начиная с lastSyncedIndex
    const firstRecord = findFirstRecordForEntity(entityId, historyRecords, lastSyncedIndex);
    const lastRecord = findLastRecordForEntity(entityId, historyRecords, lastSyncedIndex);

    console.log('[operationDiffBuilder] Found records:', {
        firstRecord: firstRecord ? { type: firstRecord.type, entityId: firstRecord.entityId } : null,
        lastRecord: lastRecord ? { type: lastRecord.type, entityId: lastRecord.entityId } : null,
    });

    let before: EntitySnapshot | null = null;
    let after: EntitySnapshot | null = null;
    let entityType = firstRecord?.entityType || 'Unknown';

    // Определяем before состояние
    if (lastSyncedIndex === 0) {
        // Если ничего не было синхронизировано, то серверное состояние - это то, что было ДО первого изменения
        // Берём before из первой записи Update
        if (firstRecord) {
            if (firstRecord.type === 'update') {
                before = firstRecord.before;
                console.log('[operationDiffBuilder] Using before from first update record');
            } else if (firstRecord.type === 'create') {
                // Если первая запись - Create, то на сервере сущности не было
                before = null;
                console.log('[operationDiffBuilder] First record is Create, before = null');
            } else {
                console.warn('[operationDiffBuilder] Unexpected first record type:', firstRecord.type);
            }
        }
    } else {
        // Ищем состояние на момент lastSyncedIndex
        before = findServerStateForEntity(entityId, historyRecords, lastSyncedIndex);
        console.log('[operationDiffBuilder] Server state from history (before):', before ? 'Found' : 'Not found');
    }

    // Определяем after состояние
    switch (operation.action) {
        case DbActionType.Create:
            // Create: after = текущее состояние из истории
            after = lastRecord && lastRecord.type !== 'delete' ? lastRecord.after : null;
            break;

        case DbActionType.Update:
            // Update: after = текущее состояние из истории
            if (lastRecord) {
                if (lastRecord.type === 'update') {
                    after = lastRecord.after;
                } else if (lastRecord.type === 'create') {
                    after = lastRecord.after;
                }
            }
            break;

        case DbActionType.Delete:
            // Delete: after = null (сущность удалена)
            after = null;
            break;

        default:
            console.warn('[operationDiffBuilder] Unknown action type:', operation.action);
            return null;
    }

    console.log('[operationDiffBuilder] Result:', {
        entityId,
        action: operation.action,
        hasBefore: !!before,
        hasAfter: !!after,
    });

    const metadata = extractMetadata(payload);

    return {
        opId: operation.opId,
        action: operation.action,
        entityId,
        entityType,
        before,
        after,
        metadata,
    };
}

/**
 * Строит diff для всех операций в списке
 */
export function buildOperationsDiff(
    operations: ScenarioOperationDto[],
    historyRecords: HistoryRecord[],
    lastSyncedIndex: number
): OperationDiff[] {
    const diffs: OperationDiff[] = [];

    for (const operation of operations) {
        const diff = buildOperationDiff(operation, historyRecords, lastSyncedIndex);
        if (diff) {
            diffs.push(diff);
        }
    }

    return diffs;
}

/**
 * Форматирует diff для отображения в UI
 */
export function formatDiffSummary(diff: OperationDiff): string {
    const actionIcon = {
        [DbActionType.Create]: '➕',
        [DbActionType.Update]: '✏️',
        [DbActionType.Delete]: '🗑️',
    }[diff.action] || '❓';

    const name = diff.metadata.name || diff.entityId;

    return `${actionIcon} ${diff.action} ${diff.entityType}: ${name}`;
}
