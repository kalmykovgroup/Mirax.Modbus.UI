/**
 * ФАЙЛ: src/store/changes/types.ts
 *
 * Универсальные типы для системы отслеживания изменений
 */

/**
 * Базовая сущность - должна иметь ID
 */
export interface Entity {
    readonly id: string;
}

/**
 * Тип операции над сущностью
 */
export type ChangeAction = 'create' | 'update' | 'delete';

/**
 * Изменение сущности
 */
export interface EntityChange<T extends Entity = Entity> {
    readonly id: string;                    // ID изменения (уникальный)
    readonly entityType: string;            // Тип сущности (Step, Branch, StepRelation)
    readonly entityId: string;              // ID самой сущности
    readonly action: ChangeAction;          // Тип операции
    readonly timestamp: number;             // Время изменения
    readonly original: T | undefined;       // Исходное состояние (для update/delete)
    readonly current: T | undefined;        // Текущее состояние (для create/update)
}

/**
 * Группировка изменений по контексту (например, по scenarioId)
 * ВАЖНО: changes - это Record, а не Map (для совместимости с Redux/Immer)
 */
export interface ChangesContext {
    readonly contextId: string;
    readonly changes: Readonly<Record<string, EntityChange>>;
}

/**
 * Состояние изменений в Redux
 */
export interface ChangesState {
    readonly contexts: Readonly<Record<string, ChangesContext>>;
}

/**
 * Diff одного поля
 */
export interface FieldDiff {
    readonly field: string;
    readonly oldValue: unknown;
    readonly newValue: unknown;
    readonly isChanged: boolean;
}

/**
 * Визуальное представление изменения с diff'ами
 */
export interface ChangeVisual<T extends Entity = Entity> {
    readonly id: string;
    readonly entityType: string;
    readonly entityId: string;
    readonly action: ChangeAction;
    readonly timestamp: number;
    readonly entity: T | undefined;
    readonly diffs: readonly FieldDiff[];
}