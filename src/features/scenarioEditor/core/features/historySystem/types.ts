// src/features/history/types.ts

import type {Guid} from "@app/lib/types/Guid.ts";


/**
 * Базовый тип для любой сущности
 */
export interface Entity {
    readonly id: Guid;
    readonly entityType: string; // FlowType в виде строки
}

/**
 * Снимок состояния сущности
 */
export interface EntitySnapshot<T extends Entity = Entity> {
    readonly entityId: Guid;
    readonly entityType: string;
    readonly data: T;
    readonly timestamp: number;
}


/**
 * Базовые поля для всех записей истории
 */
interface BaseHistoryRecord {
    readonly id: string;
    readonly entityType: string;
    readonly timestamp: number;
    readonly description?: string | undefined;
    readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Запись о создании сущности
 */
export interface CreateRecord extends BaseHistoryRecord {
    readonly type: 'create';
    readonly entityId: string;
    readonly before: null;
    readonly after: EntitySnapshot;
}

/**
 * Запись об обновлении сущности
 */
export interface UpdateRecord extends BaseHistoryRecord {
    readonly type: 'update';
    readonly entityId: string;
    readonly before: EntitySnapshot;
    readonly after: EntitySnapshot;
}

/**
 * Запись об удалении сущности
 */
export interface DeleteRecord extends BaseHistoryRecord {
    readonly type: 'delete';
    readonly entityId: string;
    readonly before: EntitySnapshot;
    readonly after: null;
}

/**
 * Запись о батче операций (группировка)
 */
export interface BatchRecord extends BaseHistoryRecord {
    readonly type: 'batch';
    readonly entityId: 'batch'; // Константа для батча
    readonly before: null;
    readonly after: null;
    readonly records: readonly HistoryRecord[];
}

/**
 * Дискриминированный union всех записей истории
 */
export type HistoryRecord =
    | CreateRecord
    | UpdateRecord
    | DeleteRecord
    | BatchRecord;

/**
 * Type Guards для записей
 */
export function isCreateRecord(record: HistoryRecord): record is CreateRecord {
    return record.type === 'create';
}

export function isUpdateRecord(record: HistoryRecord): record is UpdateRecord {
    return record.type === 'update';
}

export function isDeleteRecord(record: HistoryRecord): record is DeleteRecord {
    return record.type === 'delete';
}

export function isBatchRecord(record: HistoryRecord): record is BatchRecord {
    return record.type === 'batch';
}

/**
 * Обработчик для конкретного типа сущности
 */
export interface EntityHandler<T extends Entity = Entity> {
    /**
     * Применить изменение (используется для redo)
     */
    apply: (snapshot: EntitySnapshot<T>) => void;

    /**
     * Отменить изменение (используется для undo)
     */
    revert: (snapshot: EntitySnapshot<T>) => void;

    /**
     * Создать снимок текущего состояния
     */
    createSnapshot: (entity: T) => EntitySnapshot<T>;

    /**
     * Удалить сущность
     */
    delete: (entityId: string) => void;

    /**
     * Создать сущность из снимка
     */
    create: (snapshot: EntitySnapshot<T>) => void;
}

/**
 * Конфигурация истории
 */
export interface HistoryConfig {
    readonly maxHistorySize: number;
    readonly enableBatching: boolean;
    readonly batchTimeout: number;
    readonly contextId: string;
}

/**
 * Контекст истории для одного сценария/графа
 */
export interface HistoryContext {
    readonly past: readonly HistoryRecord[];
    readonly present: HistoryRecord | null;
    readonly future: readonly HistoryRecord[];
    readonly isRecording: boolean;
    readonly isBatching: boolean;
    readonly batchBuffer: readonly HistoryRecord[];
    readonly config: HistoryConfig;
}

/**
 * Состояние всей системы истории
 */
export interface HistoryState {
    readonly contexts: {
        readonly [contextId: string]: HistoryContext | undefined;
    };
}