// src/features/chartsPage/charts/core/store/selectors/tabSyncSelectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { Guid } from '@app/lib/types/Guid';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto';
import {selectTabContextIds} from "@chartsPage/charts/core/store/tabsSlice.ts";

// ============= ТИПЫ =============

/**
 * Полная информация о поле для синхронизации
 */
export interface TabSyncFieldInfo {
    readonly contextId: Guid;
    readonly fieldName: string;
    readonly field: FieldDto;
    readonly templateName: string | undefined;
}

// ============= СЕЛЕКТОРЫ =============

/**
 * Получить все поля со всех контекстов вкладки
 * Возвращает массив с полной информацией о каждом поле
 */
export const selectAllTabFields = createSelector(
    [
        (state: RootState, tabId: Guid) => selectTabContextIds(state, tabId),
        (state: RootState) => state.contexts.byContext,
    ],
    (contextIds, byContext): readonly TabSyncFieldInfo[] => {
        const allFields: TabSyncFieldInfo[] = [];

        for (const contextId of contextIds) {
            const context = byContext[contextId];
            if (!context?.template) continue;

            const templateName = context.template.name;

            for (const field of context.template.selectedFields) {
                allFields.push({
                    contextId,
                    fieldName: field.name,
                    field,
                    templateName,
                });
            }
        }

        return Object.freeze(allFields);
    }
);



/**
 * Получить группированные поля по контекстам для UI
 */
export interface TabFieldsGroup {
    readonly contextId: Guid;
    readonly templateName: string | undefined;
    readonly fields: readonly TabSyncFieldInfo[];
}

export const selectTabFieldsGrouped = createSelector(
    [(state: RootState, tabId: Guid) => selectAllTabFields(state, tabId)],
    (allFields): readonly TabFieldsGroup[] => {
        const groups = new Map<Guid, TabFieldsGroup>();

        for (const fieldInfo of allFields) {
            let group = groups.get(fieldInfo.contextId);

            if (!group) {
                group = {
                    contextId: fieldInfo.contextId,
                    templateName: fieldInfo.templateName,
                    fields: [],
                };
                groups.set(fieldInfo.contextId, group);
            }

            // Мутируем временный массив для группировки
            (group.fields as TabSyncFieldInfo[]).push(fieldInfo);
        }

        // Замораживаем все группы
        const result: TabFieldsGroup[] = [];
        for (const group of groups.values()) {
            result.push({
                ...group,
                fields: Object.freeze(group.fields),
            });
        }

        return Object.freeze(result);
    }
);

