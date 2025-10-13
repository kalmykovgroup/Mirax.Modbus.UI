// src/features/chartsPage/charts/core/store/thunks/syncAutoFillThunk.ts
// THUNK: Автоматическое заполнение полей при включении синхронизации

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Guid } from '@app/lib/types/Guid';
import { addContextSyncField } from '@chartsPage/charts/core/store/chartsSlice';
import { addSyncContext, selectTabContextIds, toggleTabSync } from '@chartsPage/charts/core/store/tabsSlice';
import { selectContextSyncFields, selectTemplate } from '@chartsPage/charts/core/store/selectors/base.selectors';
import type {RootState} from "@/store/store.ts";

/**
 * Включает/выключает синхронизацию для вкладки с автоматическим заполнением полей
 *
 * ЛОГИКА ПРИ ВКЛЮЧЕНИИ (syncEnabled: false → true):
 * 1. Для каждого контекста вкладки
 * 2. Если syncFields пустой → добавить ВСЕ поля из template.selectedFields
 * 3. Добавить контекст в syncContextIds
 *
 * ЛОГИКА ПРИ ВЫКЛЮЧЕНИИ (syncEnabled: true → false):
 * - Просто выключает флаг (поля остаются для следующего включения)
 */
export const toggleTabSyncWithAutoFill = createAsyncThunk<
void,
    Guid, // tabId
{ state: RootState }
>(
    'tabs/toggleTabSyncWithAutoFill',
        async (tabId, { dispatch, getState }) => {
            const state = getState();

            // Получаем текущее состояние синхронизации
            const currentSyncEnabled = state.tabs.byId[tabId]?.syncEnabled ?? false;
            const newSyncEnabled = !currentSyncEnabled;

            console.log('[toggleTabSyncWithAutoFill]', {
                tabId,
                currentSyncEnabled,
                newSyncEnabled
            });

            // Сначала переключаем флаг
            dispatch(toggleTabSync(tabId));

            // Если ВКЛЮЧАЕМ синхронизацию → заполняем поля
            if (newSyncEnabled) {
                const contextIds = selectTabContextIds(state, tabId);

                console.log('[toggleTabSyncWithAutoFill] Auto-filling fields for contexts:', contextIds);

                for (const contextId of contextIds) {
                    // Проверяем текущие синхронизированные поля
                    const currentSyncFields = selectContextSyncFields(state, contextId);

                    // Если поля уже есть → пропускаем контекст
                    if (currentSyncFields.length > 0) {
                        console.log('[toggleTabSyncWithAutoFill] Context already has sync fields, skipping:', {
                            contextId,
                            fieldsCount: currentSyncFields.length
                        });
                        continue;
                    }

                    // Получаем шаблон с доступными полями
                    const template = selectTemplate(state, contextId);

                    if (!template) {
                        console.warn('[toggleTabSyncWithAutoFill] Template not found for context:', contextId);
                        continue;
                    }

                    const allFields = template.selectedFields;

                    if (allFields.length === 0) {
                        console.warn('[toggleTabSyncWithAutoFill] No fields in template:', contextId);
                        continue;
                    }

                    console.log('[toggleTabSyncWithAutoFill] Adding all fields to sync:', {
                        contextId,
                        fieldsCount: allFields.length,
                        fieldNames: allFields.map(f => f.name)
                    });

                    // Добавляем ВСЕ поля в синхронизацию
                    for (const field of allFields) {
                        dispatch(addContextSyncField({
                            contextId,
                            field
                        }));
                    }

                    // Добавляем контекст в список синхронизации вкладки
                    dispatch(addSyncContext({
                        tabId,
                        contextId
                    }));

                    console.log('[toggleTabSyncWithAutoFill] Context fully synced:', {
                        contextId,
                        addedFields: allFields.length
                    });
                }

                console.log('[toggleTabSyncWithAutoFill]  Auto-fill completed for tab:', tabId);
            } else {
                console.log('[toggleTabSyncWithAutoFill] Sync disabled, no auto-fill needed');
            }
        }
);