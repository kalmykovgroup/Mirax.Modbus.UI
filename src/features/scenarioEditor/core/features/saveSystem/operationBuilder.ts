// src/features/scenarioEditor/core/features/saveSystem/operationBuilder.ts

import type { HistoryRecord, BatchRecord } from '@scenario/core/features/historySystem/types';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto';
import { DbActionType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType';
import { DbEntityType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbEntityType';

/**
 * Маппинг типов сущностей из entityType в DbEntityType
 */
const ENTITY_TYPE_MAP: Record<string, DbEntityType> = {
    'BranchNode': DbEntityType.Branch,
    'DelayStepNode': DbEntityType.Step,
    'ActivitySystemNode': DbEntityType.Step,
    'SignalStepNode': DbEntityType.Step,
    'ActivityModbusNode': DbEntityType.Step,
    'ParallelStepNode': DbEntityType.Step,
    'JumpStepNode': DbEntityType.Step,
    'ConditionStepNode': DbEntityType.Step,
    'StepRelation': DbEntityType.StepRelation,
};

/**
 * Преобразует entityType в DbEntityType
 */
function mapEntityType(entityType: string): DbEntityType {
    const mapped = ENTITY_TYPE_MAP[entityType];

    if (!mapped) {
        console.warn(`[operationBuilder] Unknown entityType: ${entityType}, defaulting to Step`);
        return DbEntityType.Step;
    }

    return mapped;
}

/**
 * Извлекает payload из снимка
 * Снимки имеют структуру: { entityId, entityType, data, timestamp }
 * Нам нужно взять data (это и есть DTO сущности)
 */
function extractPayload(snapshot: any): unknown {
    if (!snapshot) return null;

    // Если это EntitySnapshot - берём data
    if (snapshot.data) {
        return snapshot.data;
    }

    // Иначе возвращаем как есть
    return snapshot;
}

/**
 * Преобразует одну запись истории в операцию
 */
function convertRecordToOperation(record: HistoryRecord): ScenarioOperationDto | null {
    // Пропускаем batch записи - они обрабатываются отдельно
    if (record.type === 'batch') {
        return null;
    }

    let action: DbActionType;
    let payload: unknown;

    switch (record.type) {
        case 'create':
            action = DbActionType.Create;
            payload = extractPayload(record.after);
            break;

        case 'update':
            action = DbActionType.Update;
            payload = extractPayload(record.after);
            break;

        case 'delete':
            action = DbActionType.Delete;
            payload = extractPayload(record.before);
            break;

        default:
            console.warn('[operationBuilder] Unknown record type:', (record as any).type);
            return null;
    }

    if (!payload) {
        console.warn('[operationBuilder] No payload for record:', record);
        return null;
    }

    const operation: ScenarioOperationDto = {
        opId: record.id,
        entity: mapEntityType(record.entityType),
        action,
        payload,
    };

    return operation;
}

/**
 * Рекурсивно обрабатывает записи истории, включая вложенные батчи
 */
function processRecords(records: HistoryRecord[]): ScenarioOperationDto[] {
    const operations: ScenarioOperationDto[] = [];

    for (const record of records) {
        if (record.type === 'batch') {
            // Рекурсивно обрабатываем записи внутри батча
            const batchRecord = record as BatchRecord;
            const batchOps = processRecords(batchRecord.records);
            operations.push(...batchOps);
        } else {
            // Обычная запись
            const operation = convertRecordToOperation(record);
            if (operation) {
                operations.push(operation);
            }
        }
    }

    return operations;
}

/**
 * Объединяет множественные операции над одной сущностью в одну финальную операцию
 *
 * Логика:
 * - Create + Update(s) = Create (с финальными данными)
 * - Create + Delete = ничего (сущность создана и удалена, не отправляем)
 * - Update(s) = Update (с финальными данными)
 * - Update(s) + Delete = Delete (с изначальными данными)
 * - Delete остаётся Delete
 */
function mergeOperations(operations: ScenarioOperationDto[]): ScenarioOperationDto[] {
    // Группируем операции по entityId
    const operationsByEntity = new Map<string, ScenarioOperationDto[]>();

    for (const op of operations) {
        const payload = op.payload as any;
        const entityId = payload?.id;

        if (!entityId) {
            console.warn('[operationBuilder] Operation without entityId, skipping:', op);
            continue;
        }

        const key = `${entityId}`;

        if (!operationsByEntity.has(key)) {
            operationsByEntity.set(key, []);
        }

        operationsByEntity.get(key)!.push(op);
    }

    const mergedOperations: ScenarioOperationDto[] = [];

    // Обрабатываем каждую группу операций
    for (const [entityKey, entityOps] of operationsByEntity.entries()) {
        if (entityOps.length === 0) continue;

        // Если только одна операция - берём её как есть
        if (entityOps.length === 1) {
            mergedOperations.push(entityOps[0]);
            continue;
        }

        // Анализируем последовательность операций
        const firstOp = entityOps[0];
        const lastOp = entityOps[entityOps.length - 1];

        // Create + ... + Delete = пропускаем (сущность создана и удалена)
        if (firstOp.action === DbActionType.Create && lastOp.action === DbActionType.Delete) {
            console.log(`[operationBuilder] Skipping Create+Delete for entity: ${entityKey}`);
            continue;
        }

        // Create + Update(s) = Create с финальными данными
        if (firstOp.action === DbActionType.Create && lastOp.action !== DbActionType.Delete) {
            mergedOperations.push({
                ...lastOp, // Берём финальные данные
                action: DbActionType.Create, // Но оставляем действие Create
                opId: firstOp.opId, // Используем ID первой операции
            });
            console.log(`[operationBuilder] Merged Create+Updates for entity: ${entityKey}`);
            continue;
        }

        // Update(s) + Delete = Delete с изначальными данными
        if (lastOp.action === DbActionType.Delete) {
            // Находим первую операцию Update, чтобы взять изначальное состояние before
            const firstUpdate = entityOps.find(op => op.action === DbActionType.Update);

            // Если есть Update, берём его before как payload для Delete
            if (firstUpdate) {
                // Извлекаем before из первого Update
                const historyRecord = historyRecords.find(r => r.id === firstUpdate.opId);
                const beforePayload = historyRecord && historyRecord.type === 'update'
                    ? extractPayload(historyRecord.before)
                    : firstUpdate.payload;

                mergedOperations.push({
                    ...lastOp,
                    payload: beforePayload, // Используем изначальное состояние
                });
            } else {
                mergedOperations.push(lastOp);
            }

            console.log(`[operationBuilder] Merged Updates+Delete for entity: ${entityKey}`);
            continue;
        }

        // Update(s) = Update с финальными данными
        if (lastOp.action === DbActionType.Update) {
            mergedOperations.push(lastOp);
            console.log(`[operationBuilder] Merged ${entityOps.length} Updates for entity: ${entityKey}`);
            continue;
        }

        // Остальные случаи - берём последнюю операцию
        mergedOperations.push(lastOp);
    }

    return mergedOperations;
}

/**
 * Основная функция: конвертирует массив записей истории в массив операций для сервера
 *
 * @param historyRecords - Массив записей из history.past
 * @returns Массив операций готовых для отправки на сервер
 */
export function buildOperationsFromHistory(
    historyRecords: HistoryRecord[]
): ScenarioOperationDto[] {
    console.log('[operationBuilder] Building operations from history:', historyRecords.length, 'records');

    const operations = processRecords(historyRecords);

    console.log('[operationBuilder] Extracted', operations.length, 'raw operations');

    // Объединяем множественные операции над одной сущностью
    const mergedOperations = mergeOperations(operations);

    console.log('[operationBuilder] After merge:', mergedOperations.length, 'operations');

    return mergedOperations;
}

/**
 * Форматирует операцию для отображения в UI (для предпросмотра)
 */
export function formatOperationForDisplay(operation: ScenarioOperationDto): string {
    const actionIcon = {
        [DbActionType.Create]: '📝',
        [DbActionType.Update]: '✏️',
        [DbActionType.Delete]: '🗑️',
    }[operation.action] || '❓';

    const entityName = {
        [DbEntityType.Step]: 'Step',
        [DbEntityType.Branch]: 'Branch',
        [DbEntityType.StepRelation]: 'Relation',
        [DbEntityType.ConditionStepBranchRelation]: 'Condition Branch Relation',
        [DbEntityType.ParallelStepBranchRelation]: 'Parallel Branch Relation',
    }[operation.entity] || 'Unknown';

    const payload = operation.payload as any;
    const entityId = payload?.id || 'unknown';
    const entityLabel = payload?.name || payload?.label || entityId;

    return `${actionIcon} ${operation.action} ${entityName}: ${entityLabel}`;
}