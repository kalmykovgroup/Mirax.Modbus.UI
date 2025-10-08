/*
// store/thunks/syncThunks.ts
// THUNK СИНХРОНИЗАЦИИ: координация загрузки для синхронизированных полей

import {createAsyncThunk} from '@reduxjs/toolkit';
import type {RootState} from '@/store/store';

import {fetchMultiSeriesData} from './dataThunks';
import {LoadingType, type SyncLoadRequest, type SyncLoadResult} from "@chartsPage/charts/core/store/types/loading.types.ts";
import {selectSyncEnabled, selectSyncFields} from "../../core/store/selectors/base.selectors";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";



// ============================================
// SYNC THUNK
// ============================================

/!**
 * Синхронизация загрузки для нескольких полей
 * - Определяет какие поля нужно загрузить
 * - Вызывает fetchMultiSeriesData с группой полей
 * - Возвращает результат синхронизации
 *
 * Логика определения необходимости загрузки - в SyncCoordinationService
 *!/
export const fetchSyncedFieldsData = createAsyncThunk<
    SyncLoadResult,
    SyncLoadRequest,
    { state: RootState }
>(
    'charts/fetchSyncedFieldsData',
    async (
        { primaryField, /!*bucketMs*!/ from, to, px },
        { dispatch, getState, rejectWithValue }
    ) => {
        const state = getState();
        const syncEnabled = selectSyncEnabled(state);
        const syncFields: readonly FieldDto[] = selectSyncFields(state);

        // Если sync отключён - загружаем только primary field
        if (!syncEnabled || syncFields.length === 0) {
            const result = await dispatch(
                fetchMultiSeriesData({
                    request: {
                        template: state.charts.template!,
                        from,
                        toMs: to,
                        px
                    },
                    fields: [primaryField],
                    loadingType: LoadingType.Zoom
                })
            ).unwrap();

            if (result.wasAborted) {
                return rejectWithValue('Request was aborted');
            }

            return {
                loadedFields: [primaryField.name],
                skippedFields: []
            };
        }

        // Собираем уникальные поля для загрузки
        const fieldMap = new Map<string, FieldDto>();

        // Добавляем sync fields
        syncFields.forEach(field => {
            fieldMap.set(field.name, field);
        });

        // Добавляем primary field
        fieldMap.set(primaryField.name, primaryField);

        const fieldsToLoad = Array.from(fieldMap.values());

        // Проверка: все ли поля инициализированы
        const uninitializedFields: string[] = [];
        fieldsToLoad.forEach(field => {
            if (!(field.name in state.charts.view)) {
                uninitializedFields.push(field.name);
            }
        });

        if (uninitializedFields.length > 0) {
            console.warn(
                '[fetchSyncedFieldsData] Uninitialized fields:',
                uninitializedFields
            );
        }

        // Загружаем данные для всех полей одним запросом
        const result = await dispatch(
            fetchMultiSeriesData({
                request: {
                    template: {
                        ...state.charts.template!,
                        selectedFields: fieldsToLoad
                    },
                    from,
                    toMs: to,
                    px
                },
                fields: fieldsToLoad,
                loadingType: LoadingType.Zoom
            })
        ).unwrap();

        if (result.wasAborted) {
            return rejectWithValue('Request was aborted');
        }

        // Возвращаем список загруженных полей
        return {
            loadedFields: fieldsToLoad.map(f => f.name),
            skippedFields: uninitializedFields
        };
    }
);*/
