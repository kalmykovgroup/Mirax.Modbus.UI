// src/features/scenarioEditor/core/features/saveSystem/operationBuilder.ts

import type { HistoryRecord, BatchRecord } from '@scenario/core/features/historySystem/types';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto';
import { DbActionType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType';
import { DbEntityType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbEntityType';
import { FlowType } from '@scenario/core/ui/nodes/types/flowType';

/**
 * Маппинг типов сущностей из FlowType в DbEntityType
 */
const ENTITY_TYPE_MAP: Record<string, DbEntityType> = {
    // FlowType значения (из StepType enum)
    [FlowType.ActivitySystem]: DbEntityType.Step,
    [FlowType.ActivityModbus]: DbEntityType.Step,
    [FlowType.Delay]: DbEntityType.Step,
    [FlowType.Condition]: DbEntityType.Step,
    [FlowType.Parallel]: DbEntityType.Step,
    [FlowType.Signal]: DbEntityType.Step,
    [FlowType.Jump]: DbEntityType.Step,

    // Branch
    [FlowType.BranchNode]: DbEntityType.Branch,

    // Relation (не FlowType, но используется в системе)
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
 * Очищает payload от лишних полей, используя подход "чёрного списка"
 * Удаляет только известные проблемные поля (навигационные свойства, readonly поля),
 * всё остальное пропускает без изменений.
 *
 * Это позволяет автоматически поддерживать новые поля без изменения кода.
 */
function cleanPayload(data: any, action: DbActionType): any {
    // "Чёрный список" - поля которые ТОЧНО НЕ должны отправляться на сервер
    const excludeFields = new Set([
        // Внутренние поля клиента
        'entityType',           // FlowType - внутренний тип клиента
        '__persisted',          // Флаг клиента о сохранении

    ]);

    // Создаём очищенный объект
    const cleaned: any = {};

    // Копируем все поля, кроме тех что в чёрном списке
    for (const key in data) {
        if (data.hasOwnProperty(key) && !excludeFields.has(key)) {
            cleaned[key] = data[key];
        }
    }

    return cleaned;
}

/**
 * Извлекает payload из снимка
 * Снимки имеют структуру: { entityId, entityType, data, timestamp }
 * Нам нужно взять data (это и есть DTO сущности), но убрать entityType
 *
 * ВАЖНО: Для полиморфной десериализации .NET поле '$type' ДОЛЖНО быть первым в JSON
 */
function extractPayload(snapshot: any, action: DbActionType): unknown {
    if (!snapshot) return null;

    // Если это EntitySnapshot - берём data
    if (snapshot.data) {
        const data = snapshot.data;

        // Убираем entityType - это внутренний тип клиента (FlowType)
        // ВАЖНО: Трансформируем 'type' в '$type' для .NET и помещаем первым
        const { entityType, type, ...rest } = data;

        let cleaned: any;

        // Для шагов (есть поле type) применяем очистку
        if (type !== undefined) {
            // Сначала очищаем от лишних полей
            const dataWithType = { type, ...rest };
            cleaned = cleanPayload(dataWithType, action);

            // Затем трансформируем type в $type и помещаем на первое место
            const { type: stepType, ...restCleaned } = cleaned;
            return { $type: stepType, ...restCleaned };
        }

        // Для Branch просто убираем entityType
        return rest;
    }

    // Иначе возвращаем как есть
    return snapshot;
}

/**
 * Валидирует payload перед отправкой на сервер
 * Возвращает null если payload невалиден и не должен быть отправлен
 */
function validatePayload(payload: any, action: DbActionType, entityType: string): string | null {
    // Проверяем только для Create и Update
    if (action !== DbActionType.Create && action !== DbActionType.Update) {
        return null; // Delete всегда валиден
    }

    // Валидация для ActivitySystem
    if (entityType === FlowType.ActivitySystem) {
        if (!payload.systemActionId) {
            return 'ActivitySystemStep requires systemActionId';
        }
    }

    // Валидация для ActivityModbus
    if (entityType === FlowType.ActivityModbus) {
        if (!payload.modbusDeviceActionId || !payload.modbusDeviceAddressId) {
            return 'ActivityModbusStep requires modbusDeviceActionId and modbusDeviceAddressId';
        }
    }

    // Валидация для Delay
    if (entityType === FlowType.Delay) {
        if (!payload.timeSpan) {
            return 'DelayStep requires timeSpan';
        }
    }

    return null; // Валидация пройдена
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
            payload = extractPayload(record.after, action);
            break;

        case 'update':
            action = DbActionType.Update;
            payload = extractPayload(record.after, action);
            break;

        case 'delete':
            action = DbActionType.Delete;
            payload = extractPayload(record.before, action);
            break;

        default:
            console.warn('[operationBuilder] Unknown record type:', (record as any).type);
            return null;
    }

    if (!payload) {
        console.warn('[operationBuilder] No payload for record:', record);
        return null;
    }

    // Валидация payload перед отправкой
    const validationError = validatePayload(payload, action, record.entityType);
    if (validationError) {
        console.warn(`[operationBuilder] Skipping invalid operation: ${validationError}`, {
            entityType: record.entityType,
            entityId: (payload as any)?.id,
            action,
        });
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
function mergeOperations(operations: ScenarioOperationDto[], historyRecords: HistoryRecord[]): ScenarioOperationDto[] {
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
            continue;
        }

        // Create + Update(s) = Create с финальными данными
        if (firstOp.action === DbActionType.Create && lastOp.action !== DbActionType.Delete) {
            mergedOperations.push({
                ...lastOp, // Берём финальные данные
                action: DbActionType.Create, // Но оставляем действие Create
                opId: firstOp.opId, // Используем ID первой операции
            });
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
                    ? extractPayload(historyRecord.before, DbActionType.Delete)
                    : firstUpdate.payload;

                mergedOperations.push({
                    ...lastOp,
                    payload: beforePayload, // Используем изначальное состояние
                });
            } else {
                mergedOperations.push(lastOp);
            }

            continue;
        }

        // Update(s) = Update с финальными данными
        if (lastOp.action === DbActionType.Update) {
            mergedOperations.push(lastOp);
            continue;
        }

        // Остальные случаи - берём последнюю операцию
        mergedOperations.push(lastOp);
    }

    return mergedOperations;
}

/**
 * Создает "обратную" операцию для откаченной записи истории
 */
function createReverseOperation(record: HistoryRecord): ScenarioOperationDto | null {
    if (record.type === 'batch') {
        // Для batch не создаем обратную операцию на этом уровне,
        // они будут обработаны рекурсивно
        return null;
    }

    let action: DbActionType;
    let payload: unknown;

    if (record.type === 'create') {
        // Create была откачена → нужно Delete
        action = DbActionType.Delete;
        payload = extractPayload(record.after, action);
    } else if (record.type === 'update') {
        // Update была откачена → нужно Update с before состоянием
        action = DbActionType.Update;
        payload = extractPayload(record.before, action);
    } else if (record.type === 'delete') {
        // Delete была откачена → нужно Create с before состоянием
        action = DbActionType.Create;
        payload = extractPayload(record.before, action);
    } else {
        return null;
    }

    // Валидация payload перед созданием обратной операции
    const validationError = validatePayload(payload, action, record.entityType);
    if (validationError) {
        console.warn(`[operationBuilder] Skipping invalid reverse operation: ${validationError}`, {
            entityType: record.entityType,
            entityId: (payload as any)?.id,
            action,
            recordType: record.type,
        });
        return null;
    }

    return {
        opId: crypto.randomUUID(),
        entity: mapEntityType(record.entityType),
        action,
        payload,
    };
}

/**
 * Обрабатывает откаченные операции из future для создания компенсирующих операций
 */
function processUndoneRecords(undoneRecords: HistoryRecord[]): ScenarioOperationDto[] {
    const operations: ScenarioOperationDto[] = [];

    for (const record of undoneRecords) {
        if (record.type === 'batch') {
            // Рекурсивно обрабатываем записи внутри batch
            const batchRecord = record as BatchRecord;
            const batchOps = processUndoneRecords(batchRecord.records);
            operations.push(...batchOps);
        } else {
            const reverseOp = createReverseOperation(record);
            if (reverseOp) {
                operations.push(reverseOp);
            }
        }
    }

    return operations;
}

/**
 * Основная функция: конвертирует массив записей истории в массив операций для сервера
 *
 * @param historyRecords - Массив записей из history.past
 * @param lastSyncedIndex - Индекс до которого операции уже синхронизированы с сервером
 * @param futureRecords - Массив записей из history.future (для обработки Undo)
 * @returns Массив операций готовых для отправки на сервер
 */
export function buildOperationsFromHistory(
    historyRecords: HistoryRecord[],
    lastSyncedIndex: number = 0,
    futureRecords: HistoryRecord[] = []
): ScenarioOperationDto[] {
    // Случай 1: Были сделаны Undo после последнего сохранения
    if (historyRecords.length < lastSyncedIndex) {
        // Количество откаченных операций
        const undoneCount = lastSyncedIndex - historyRecords.length;

        // Откаченные операции находятся в начале future
        const undoneRecords = futureRecords.slice(0, undoneCount);

        // Создаем компенсирующие операции для откаченных изменений
        const reverseOperations = processUndoneRecords(undoneRecords);

        return reverseOperations;
    }

    // Случай 2: Нормальная синхронизация - берем только новые операции после lastSyncedIndex
    const newRecords = historyRecords.slice(lastSyncedIndex);

    if (newRecords.length === 0) {
        return [];
    }

    const operations = processRecords(newRecords);
    const mergedOperations = mergeOperations(operations, newRecords);
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