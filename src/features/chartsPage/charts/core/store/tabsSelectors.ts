// src/features/chartsPage/charts/core/store/selectors/tabSyncSelectors.ts

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { Guid } from '@app/lib/types/Guid';
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto';
import {selectTabContextIds, selectTabInfo, type SyncFieldId} from "@chartsPage/charts/core/store/tabsSlice.ts";

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
 * Получить синхронизированные поля с полной информацией
 */
export const selectTabSyncFieldsInfo = createSelector(
    [
        (state: RootState, tabId: Guid) => selectTabInfo(state, tabId),
        (state: RootState, tabId: Guid) => selectAllTabFields(state, tabId),
    ],
    (tabInfo, allFields): readonly TabSyncFieldInfo[] => {
        if (!tabInfo || !tabInfo.syncEnabled || tabInfo.syncFields.length === 0) {
            return [];
        }

        const syncFieldIds = tabInfo.syncFields;
        const syncedFields: TabSyncFieldInfo[] = [];

        for (const syncId of syncFieldIds) {
            const fieldInfo = allFields.find(
                (f) => f.contextId === syncId.contextId && f.fieldName === syncId.fieldName
            );

            if (fieldInfo) {
                syncedFields.push(fieldInfo);
            }
        }

        return Object.freeze(syncedFields);
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

/**
 * Проверить, синхронизировано ли поле
 */
export const selectIsTabFieldSynced = (
    state: RootState,
    tabId: Guid,
    contextId: Guid,
    fieldName: string
): boolean => {
    const tabInfo = selectTabInfo(state, tabId);
    if (!tabInfo || !tabInfo.syncEnabled) return false;

    return tabInfo.syncFields.some(
        (f) => f.contextId === contextId && f.fieldName === fieldName
    );
};

/**
 * Получить все SyncFieldId для синхронизации (кроме текущего поля)
 * Используется для применения зума к остальным полям
 */
export const selectOtherSyncFields = createSelector(
    [
        (state: RootState, tabId: Guid) => selectTabInfo(state, tabId),
        (_state: RootState, _tabId: Guid, currentContextId: Guid) => currentContextId,
        (_state: RootState, _tabId: Guid, _currentContextId: Guid, currentFieldName: string) =>
            currentFieldName,
    ],
    (tabInfo, currentContextId, currentFieldName): readonly SyncFieldId[] => {
        if (!tabInfo || !tabInfo.syncEnabled) return [];

        return tabInfo.syncFields.filter(
            (f) => !(f.contextId === currentContextId && f.fieldName === currentFieldName)
        );
    }
);