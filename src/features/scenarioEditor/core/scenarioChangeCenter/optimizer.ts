/**
 * ФАЙЛ: src/store/changes/optimizer.ts
 *
 * Утилиты для оптимизации и анализа изменений
 */

import { isEqual } from 'lodash';
import type { Entity, EntityChange, FieldDiff, ChangeVisual } from '@scenario/core/scenarioChangeCenter/types';

/**
 * Оптимизирует массив изменений, схлопывая дубликаты
 * (уже оптимизировано в slice через optimizePair)
 */
export function optimizeChanges<T extends Entity>(
    changes: readonly EntityChange<T>[]
): readonly EntityChange<T>[] {
    return changes;
}

/**
 * Вычисляет diff между двумя объектами
 */
export function calculateDiff<T extends Entity>(
    original: T | undefined,
    current: T | undefined
): readonly FieldDiff[] {
    const diffs: FieldDiff[] = [];

    if (original === undefined && current === undefined) {
        return [];
    }

    if (original === undefined && current !== undefined) {
        // Создание - все поля новые
        for (const [field, newValue] of Object.entries(current)) {
            if (field === 'id') continue;

            diffs.push({
                field,
                oldValue: undefined,
                newValue,
                isChanged: true,
            });
        }
        return diffs;
    }

    if (original !== undefined && current === undefined) {
        // Удаление - все поля старые
        for (const [field, oldValue] of Object.entries(original)) {
            if (field === 'id') continue;

            diffs.push({
                field,
                oldValue,
                newValue: undefined,
                isChanged: true,
            });
        }
        return diffs;
    }

    // Обновление - находим различия
    const allKeys = new Set([
        ...Object.keys(original as object),
        ...Object.keys(current as object),
    ]);

    for (const key of allKeys) {
        if (key === 'id') continue;

        const originalRecord = original as Record<string, unknown>;
        const currentRecord = current as Record<string, unknown>;

        const oldValue = originalRecord[key];
        const newValue = currentRecord[key];

        diffs.push({
            field: key,
            oldValue,
            newValue,
            isChanged: !isEqual(oldValue, newValue),
        });
    }

    return diffs.filter(d => d.isChanged);
}

/**
 * Преобразует изменение в визуальное представление с diff'ами
 */
export function toVisual<T extends Entity>(
    change: EntityChange<T>
): ChangeVisual<T> {
    const diffs = calculateDiff(change.original, change.current);

    return {
        id: change.id,
        entityType: change.entityType,
        entityId: change.entityId,
        action: change.action,
        timestamp: change.timestamp,
        entity: change.current ?? change.original,
        diffs,
    };
}

/**
 * Преобразует массив изменений в визуальные представления
 */
export function toVisuals<T extends Entity>(
    changes: readonly EntityChange<T>[]
): readonly ChangeVisual<T>[] {
    return changes
        .map(change => toVisual(change))
        .sort((a, b) => b.timestamp - a.timestamp);
}