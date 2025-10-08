
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from "@/store/store";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/lib/storage";
import {notify} from "@app/lib/notify.ts";
import {metadataApi} from "@chartsPage/metaData/shared/api/metadataApi.ts";
import type {DatabaseDto} from "@chartsPage/metaData/shared/dtos/DatabaseDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {EntityDto} from "@chartsPage/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import {setActiveTemplateSelectedFields} from "@chartsPage/template/store/chartsTemplatesSlice.ts";

// ---- Типы ----
type LoadKey = 'databases' | 'entities' | 'fields'
type LoadFlags  = Record<LoadKey, boolean>
type ErrorFlags = Record<LoadKey, string | undefined>

export type ChartsMetaState = {

    // БД
    databases: DatabaseDto[]

    // Загрузка/ошибки
    loading: LoadFlags
    errors:  ErrorFlags

    // КЭШИ, чтобы не дёргать сервер лишний раз
    databasesLoaded: boolean
    getDatabasesById: Record<Guid, DatabaseDto>                 // dbId -> entityNames[]

}


const initialState: ChartsMetaState = {
    databases: [],
    loading: { databases: false, entities: false, fields: false },
    errors:  { databases: undefined, entities: undefined, fields: undefined },

    databasesLoaded: false,
    getDatabasesById: {} as Record<Guid, DatabaseDto>,

}


/* ======================== БАЗЫ ДАННЫХ ======================== */
export const fetchDatabases = createAsyncThunk<
    void,
    { force?: boolean } | void,
    { state: RootState }
>(
    'chartsMeta/fetchDatabases',
    async (args, { getState, dispatch }) => {

        const force = !!(args && (args as any).force);
        const stChartsMeta = getState().chartsMeta;

        if (!force && stChartsMeta.databasesLoaded && stChartsMeta.databases.length > 0) return;

        dispatch(setDatabasesLoading({ key: 'databases', value: true }));
        const sub = dispatch(metadataApi.endpoints.getDatabases.initiate());
        try {
            const databases = await notify.run(
                sub.unwrap(), // промис RTK Query
                {
                    loading: { text: 'Загружаю базы…' },
                    success: { text: 'Базы загружены', toastOptions: { duration: 700 } },
                    error:   { text: 'Не удалось загрузить базы', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-databases' } // чтобы не плодить дубли при повторных кликах
            ) as DatabaseDto[];


            // только свои данные: список + флаг
            dispatch(setDatabases(databases));

            dispatch(setDatabasesLoaded(true));

            dispatch(clearDatabasesError('databases'));
        } catch (e: any) {

            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed';
            dispatch(setDatabasesError({ key: 'databases', error: msg }));
        } finally {
            dispatch(setDatabasesLoading({ key: 'databases', value: false }));
            sub.unsubscribe();
        }
    }
);

/* ======================== СПИСОК ТАБЛИЦ ======================== */
export const fetchEntities = createAsyncThunk<
    void,
    void,
    { state: RootState }
>(
    'chartsMeta/fetchEntities',
    async (_args, { getState, dispatch }) => {

        const stChartsTemplates = getState().chartsTemplates;
        const db = stChartsTemplates.activeTemplate.database;


        if (!db) throw new Error('Database does not exist');


        dispatch(setDatabasesLoading({ key: 'entities', value: true }));
        const sub = dispatch(metadataApi.endpoints.getEntities.initiate());
        try {

            const data = await notify.run(
                sub.unwrap(), // промис RTK Query
                {
                    loading: { text: 'Загружаю таблицы…' },
                    success: { text: 'Таблицы загружены', toastOptions: { duration: 700 } },
                    error:   { text: 'Не удалось загрузить таблицы', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-entities' } // чтобы не плодить дубли при повторных кликах
            ) as EntityDto[];


            // только свои данные: entities + кэш
            dispatch(setEntitiesDatabase({dbId: db.id, entities: data}));

            dispatch(clearDatabasesError('entities'));
        } catch (e: any) {
            // при ошибке — оставляем entities пустыми (fields уже были очищены при setActiveDb)
            dispatch(setEntitiesDatabase({dbId: db.id, entities: undefined}));
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed';
            dispatch(setDatabasesError({ key: 'entities', error: msg }));
        } finally {
            dispatch(setDatabasesLoading({ key: 'entities', value: false }));
        }
    }
);

/* ======================== ПОЛЯ СУЩНОСТИ ======================== */
export const fetchEntityFields = createAsyncThunk<
    void,
    { entity?: EntityDto } | void,
    { state: RootState }
>(
    'chartsMeta/fetchEntityFields',
    async (args, { getState, dispatch }) => {

        const stChartsTemplates = getState().chartsTemplates;

        const db: DatabaseDto | undefined = stChartsTemplates.activeTemplate.database;
        const entityName: string | undefined = stChartsTemplates.activeTemplate.entity?.name;

        if(db == undefined) throw Error("databaseId is undefined");
        if(entityName == undefined) throw Error("entity name is undefined");

        const entity = (args && (args as any).entity) || stChartsTemplates.activeTemplate.entity;

        // только свои данные: если entity нет — очищаем fields
        if (!entity) {
            dispatch(setFieldsDatabase({dbId: db.id, entity: entity, fields: undefined}));
            return;
        }

        dispatch(setDatabasesLoading({ key: 'fields', value: true }));

        const sub = dispatch(
            metadataApi.endpoints.getEntityFields.initiate({ entity: entity })
        );
        try {

            const data = await notify.run(
                sub.unwrap(),
                {
                    loading: { text: 'Загружаю поля…' },
                    success: { text: 'Поля загружены', toastOptions: { duration: 700 } },
                    error:   { text: 'Не удалось загрузить поля', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-fields' } // чтобы не плодить дубли при повторных кликах
            ) as FieldDto[];


            const list = data ?? [];

            // только свои данные: fields + кэш
             dispatch(setFieldsDatabase({dbId: db.id, entity: entity, fields: list}));
            //dispatch(cacheFieldsForEntity({ dbId, entity, fields: list }));

            // синхронизируем выбранные имена с наличием в списке полей
            const existing = new Set(list.map(f => f.name));
            dispatch(setActiveTemplateSelectedFields(stChartsTemplates.activeTemplate.selectedFields.filter(n => existing.has(n.name))));

            dispatch(clearDatabasesError('fields'));
        } catch (e: any) {
            // при ошибке — fields пустые
            dispatch(setFieldsDatabase({dbId: db.id, entity: entity, fields: undefined}));
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed';
            dispatch(setDatabasesError({ key: 'fields', error: msg }));
        } finally {
            dispatch(setDatabasesLoading({ key: 'fields', value: false }));
        }
    }
);



// ========================== SLICE ==========================
const chartsMetaSlice = createSlice({
    name: 'chartsMeta',
    initialState,
    reducers: {


        setFieldsDatabase(state, action: PayloadAction<{dbId: Guid, entity: string, fields: FieldDto[] | undefined}>) {

            const dbId : Guid = action.payload.dbId;
            const db: DatabaseDto | undefined = state.getDatabasesById[dbId];

            if(!db) throw Error("database is undefined");

            const entity: EntityDto | undefined = db.entities.find(e => e.name == action.payload.entity);

            if(!entity) throw Error("entity is undefined");


            entity.fields = action.payload.fields ?? []
        },

        setDatabases(state, action: PayloadAction<DatabaseDto[]>) {
            state.databases = action.payload ?? []
            state.databases.forEach((db: DatabaseDto) => {
                state.getDatabasesById[db.id] = db;
            });

        },
        setDatabasesLoaded(state, action: PayloadAction<boolean>) {
            state.databasesLoaded = action.payload
        },

        // --- Таблицы ---
        setEntitiesDatabase(state, action: PayloadAction<{dbId: Guid, entities: EntityDto[] | undefined}>) {

            const dbId : Guid = action.payload.dbId;
            const db: DatabaseDto | undefined = state.getDatabasesById[dbId];

            if(db == undefined) throw Error("database is undefined");

            db.entities =  action.payload.entities ?? [];

        },


        // --- Loading/Error (безопасно) ---
        setDatabasesLoading(state, action: PayloadAction<{ key: LoadKey; value: boolean }>) {
            const { key, value } = action.payload
            state.loading[key] = value
            if (value) state.errors[key] = undefined
        },
        setDatabasesError(state, action: PayloadAction<{ key: LoadKey; error?: string }>) {
            const { key, error } = action.payload
            state.errors[key] = error ?? 'Unknown error'
        },
        clearDatabasesError(state, action: PayloadAction<LoadKey>) {
            const key = action.payload
            state.errors[key] = undefined
        },


        resetDatabasesState() {
            return { ...initialState }
        },
    },
})

export const {
    setDatabases,
    setDatabasesLoaded,
    setEntitiesDatabase,
    setFieldsDatabase,
    setDatabasesLoading, setDatabasesError, clearDatabasesError,
} = chartsMetaSlice.actions


// ========================== СЕЛЕКТОРЫ ==========================
export const selectDatabases     = (s: RootState) => s.chartsMeta.databases

export const selectGetDatabasesById     = (s: RootState) => s.chartsMeta.getDatabasesById
export const selectDatabasesLoaded     = (s: RootState) => s.chartsMeta.databasesLoaded

export const selectChartsMetaLoading       = (s: RootState) => s.chartsMeta.loading
export const selectErrors        = (s: RootState) => s.chartsMeta.errors


// Config: localStorage для persistent (items), transform фильтрует transient
const chartsMetaPersistConfig = {
    key: 'chartsMeta',
    storage,
    whitelist: [],
};

// Оборачиваем reducer (без изменений логики)
export const chartsMetaReducer = persistReducer(chartsMetaPersistConfig, chartsMetaSlice.reducer);


