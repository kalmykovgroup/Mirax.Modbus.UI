// src/charts/store/chartsMetaSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store/types'
import type {
    ChartReqTemplateDto,
    EditChartReqTemplate
} from "@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts";
import type {DatabaseDto} from "@charts/shared/contracts/metadata/Dtos/DatabaseDto.ts";
import {metadataApi} from "@charts/shared/api/metadataApi.ts";
import type {EntityMetaDto} from "@charts/shared/contracts/metadata/Dtos/EntityMetaDto.ts";
import type {FieldMetaDto} from "@charts/shared/contracts/metadata/Dtos/FieldMetaDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

// ---- Типы ----
type LoadKey = 'databases' | 'entities' | 'fields'
type LoadFlags  = Record<LoadKey, boolean>
type ErrorFlags = Record<LoadKey, string | undefined>


export type ChartsMetaState = {
    editEntity: EditChartReqTemplate
    // БД
    databases: DatabaseDto[]
  //  activeDb?: string | undefined

    // Таблицы
    entities: string[]

    // Поля выбранной таблицы
    fields: FieldMetaDto[]

    // Загрузка/ошибки
    loading: LoadFlags
    errors:  ErrorFlags

    // КЭШИ, чтобы не дёргать сервер лишний раз
    databasesLoaded: boolean
    entitiesByDb: Record<Guid, string[]>                 // dbId -> entityNames[]
    fieldsByKey: Record<string, FieldMetaDto[]>        //(ключ = `${dbId}::${entity}`):

}

const initialState: ChartsMetaState = {
    editEntity: {
    id: undefined,
        name: undefined,
        description: undefined,
        databaseId: undefined,
        database: undefined,
        entity: undefined,
        timeField: undefined,
        fields: [],          // ← пустой массив, чтобы .includes не падал
        filters: {},         // ← пустой объект для UI/серверной синхры
} as EditChartReqTemplate,

    databases: [],
    entities: [],
    fields: [],

    loading: { databases: false, entities: false, fields: false },
    errors:  { databases: undefined, entities: undefined, fields: undefined },

    databasesLoaded: false,
    entitiesByDb: {},
    fieldsByKey: {},
}


// helper
// ===== helper: ключ кэша полей =====
const fk = (dbId: Guid | undefined, entity: string | undefined) =>
    dbId && entity ? `${dbId}::${entity}` : '';

/* ======================== БАЗЫ ДАННЫХ ======================== */
export const fetchDatabases = createAsyncThunk<
    void,
    { force?: boolean } | void,
    { state: RootState }
>(
    'chartsMeta/fetchDatabases',
    async (args, { getState, dispatch }) => {
        const force = !!(args && (args as any).force);
        const st = getState().chartsMeta;

        if (!force && st.databasesLoaded && st.databases.length > 0) return;

        dispatch(setLoading({ key: 'databases', value: true }));
        const sub = dispatch(metadataApi.endpoints.getDatabases.initiate());
        try {
            const databases = (await sub.unwrap()) as DatabaseDto[];

            // только свои данные: список + флаг
            dispatch(setDatabases(databases));
            dispatch(setDatabasesLoaded(true));

            dispatch(clearError('databases'));
        } catch (e: any) {
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed';
            dispatch(setError({ key: 'databases', error: msg }));
        } finally {
            dispatch(setLoading({ key: 'databases', value: false }));
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
        const st = getState().chartsMeta;
        const db = st.editEntity.database;

        // только свои данные: если БД нет — очищаем entities
        if (!db) {
            dispatch(setEntities([]));
            return;
        }

        // кэш по БД
        const cached = st.entitiesByDb[db.id];
        if (cached) {
            console.log("получили из кеша таблицы для базы",db?.name,  db.id)
            dispatch(setEntities(cached));
            // НИКАКИХ setActiveEntity / fetchEntityFields здесь
            return;
        }

        dispatch(setLoading({ key: 'entities', value: true }));
        const sub = dispatch(metadataApi.endpoints.getEntities.initiate({dbId: db.id}));
        try {
            const data = (await sub.unwrap()) as EntityMetaDto[];
            const names = (data ?? [])
                .map(x => (x as any).name as string)
                .filter(Boolean);

            // только свои данные: entities + кэш
            dispatch(setEntities(names));
            dispatch(cacheEntitiesForDb({ databaseId: db.id, entities: names }));

            dispatch(clearError('entities'));
        } catch (e: any) {
            console.log(e);
            // при ошибке — оставляем entities пустыми (fields уже были очищены при setActiveDb)
            dispatch(setEntities([]));
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed';
            dispatch(setError({ key: 'entities', error: msg }));
        } finally {
            dispatch(setLoading({ key: 'entities', value: false }));
            sub.unsubscribe();
        }
    }
);

/* ======================== ПОЛЯ СУЩНОСТИ ======================== */
export const fetchEntityFields = createAsyncThunk<
    void,
    { entity?: string } | void,
    { state: RootState }
>(
    'chartsMeta/fetchEntityFields',
    async (args, { getState, dispatch }) => {
        const st = getState().chartsMeta;
        const dbId = st.editEntity.databaseId;

        if(dbId == undefined) throw Error("databaseId is undefined");

        const entity = (args && (args as any).entity) || st.editEntity.entity;

        // только свои данные: если entity нет — очищаем fields
        if (!entity) {
            dispatch(setFields([]));
            return;
        }

        // кэш полей с учётом БД
        const key = fk(dbId, entity);
        const cached = key ? st.fieldsByKey[key] : undefined;
        if (cached) {
            dispatch(setFields(cached));
            // подрежем выбранные поля до существующих — это про fields/selection
            const existing = new Set(cached.map(f => f.name));
            dispatch(setFilterFields(st.editEntity.fields.filter(n => existing.has(n))));
            // НИКАКИХ setActiveEntity здесь
            return;
        }

        dispatch(setLoading({ key: 'fields', value: true }));
        const sub = dispatch(
            metadataApi.endpoints.getEntityFields.initiate({ entity: entity, dbId: dbId })
        );
        try {
            const data = (await sub.unwrap()) as FieldMetaDto[];
            const list = data ?? [];

            // только свои данные: fields + кэш
            dispatch(setFields(list));
            dispatch(cacheFieldsForEntity({ dbId, entity, fields: list }));

            // синхронизируем выбранные имена с наличием в списке полей
            const existing = new Set(list.map(f => f.name));
            dispatch(setFilterFields(st.editEntity.fields.filter(n => existing.has(n))));

            dispatch(clearError('fields'));
        } catch (e: any) {
            // при ошибке — fields пустые
            dispatch(setFields([]));
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed';
            dispatch(setError({ key: 'fields', error: msg }));
        } finally {
            dispatch(setLoading({ key: 'fields', value: false }));
            sub.unsubscribe();
        }
    }
);




// ========================== SLICE ==========================
const chartsMetaSlice = createSlice({
    name: 'chartsMeta',
    initialState,
    reducers: {

        setActiveDb(state, action: PayloadAction<DatabaseDto>) {
            const db = action.payload
            state.editEntity.databaseId = db.id
            state.editEntity.database   = db

            // важный сброс зависимостей — UI не держит старые значения
            state.entities = []
            state.editEntity.entity = undefined
            state.fields = []
            state.editEntity.fields = []
        },

        cacheEntitiesForDb(state, action: PayloadAction<{ databaseId: Guid; entities: string[] }>) {
            const { databaseId, entities } = action.payload
            if (!databaseId) return
            state.entitiesByDb[databaseId] = entities ?? []
        },

        setFields(state, action: PayloadAction<FieldMetaDto[]>) {
            state.fields = action.payload ?? []
        },

        cacheFieldsForEntity(
            state,
            action: PayloadAction<{ dbId: Guid | undefined; entity: string; fields: FieldMetaDto[] }>
        ) {
            const { dbId, entity, fields } = action.payload
            const key = fk(dbId, entity)
            if (!key) return
            state.fieldsByKey[key] = fields ?? []
        },

        setApplyTemplate(state, action: PayloadAction<ChartReqTemplateDto>) {
             state.editEntity = action.payload
        },

        // --- БД ---
        setEditEntityName(state, action: PayloadAction<string>) {
            state.editEntity.name = action.payload
        },
        setEditEntityDesc(state, action: PayloadAction<string>) {
            state.editEntity.description = action.payload
        },
        setDatabases(state, action: PayloadAction<DatabaseDto[]>) {
            state.databases = action.payload ?? []
        },
        setDatabasesLoaded(state, action: PayloadAction<boolean>) {
            state.databasesLoaded = action.payload
        },

        // --- Таблицы ---
        setEntities(state, action: PayloadAction<string[]>) {
            state.entities = action.payload ?? []
            // если activeEntity отсутствует — не назначаем автоматически здесь
        },
        setActiveEntity(state, action: PayloadAction<string | undefined>) {
            state.editEntity.entity = action.payload
        },
        clearBoundTemplate(state) {
            state.editEntity.id = undefined
        },


        // --- Выбор полей пользователем ---
        setFilterFields(state, action: PayloadAction<string[]>) {
            state.editEntity.fields = Array.from(new Set(action.payload ?? []))
        },
        toggleFilterField(state, action: PayloadAction<string>) {
            const name = action.payload
            const set = new Set(state.editEntity.fields)
            set.has(name) ? set.delete(name) : set.add(name)
            state.editEntity.fields = Array.from(set)
        },

        // --- Loading/Error (безопасно) ---
        setLoading(state, action: PayloadAction<{ key: LoadKey; value: boolean }>) {
            const { key, value } = action.payload
            state.loading[key] = value
            if (value) state.errors[key] = undefined
        },
        setError(state, action: PayloadAction<{ key: LoadKey; error?: string }>) {
            const { key, error } = action.payload
            state.errors[key] = error ?? 'Unknown error'
        },
        clearError(state, action: PayloadAction<LoadKey>) {
            const key = action.payload
            state.errors[key] = undefined
        },

        // --- Сбросы зависимостей ---
        resetEntitiesAndFields(state) {
            state.entities = []
            state.editEntity.entity = undefined
            state.fields = []
            state.editEntity.fields = []
        },
        resetFieldsOnly(state) {
            state.fields = []
            state.editEntity.fields = []
        },
        clearAll() {
            return { ...initialState }
        },
    },
})

export const {
    // БД
    setDatabases, setActiveDb, setDatabasesLoaded,
    // Таблицы
    setEntities, setActiveEntity, cacheEntitiesForDb,
    // Поля
    setFields, cacheFieldsForEntity,
    // Выбор полей
    setFilterFields, toggleFilterField,
    // Loading/Error
    setLoading, setError, clearError,
    // Сбросы
    clearBoundTemplate,
    resetEntitiesAndFields,
    resetFieldsOnly,
    clearAll,
    setEditEntityName,
    setEditEntityDesc,
    setApplyTemplate
} = chartsMetaSlice.actions

export default chartsMetaSlice.reducer

// ========================== СЕЛЕКТОРЫ ==========================
export const selectEditEntity     = (s: RootState) => s.chartsMeta.editEntity
export const selectDatabases     = (s: RootState) => s.chartsMeta.databases

export const selectEntities      = (s: RootState) => s.chartsMeta.entities

export const selectFields        = (s: RootState) => s.chartsMeta.fields

export const selectLoading       = (s: RootState) => s.chartsMeta.loading
export const selectErrors        = (s: RootState) => s.chartsMeta.errors

