
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store/types'
import type {DatabaseDto} from "@charts/shared/contracts/metadata/Dtos/DatabaseDto.ts";
import {metadataApi} from "@charts/shared/api/metadataApi.ts";
import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {ChartReqTemplateDto} from "@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts";
import type {FilterClause} from "@charts/shared/contracts/chartTemplate/Dtos/FilterClause.ts";
import type {SqlFilter} from "@charts/shared/contracts/chartTemplate/Dtos/SqlFilter.ts";
import type {SqlParam} from "@charts/shared/contracts/chartTemplate/Dtos/SqlParam.ts";

// ---- Типы ----
type LoadKey = 'databases' | 'entities' | 'fields'
type LoadFlags  = Record<LoadKey, boolean>
type ErrorFlags = Record<LoadKey, string | undefined>



export type EditChartReqTemplate = {
    id?: Guid | undefined
    name: string | undefined
    description?: string | undefined

    // настройки графиков
    databaseId? : Guid | undefined
    database?: DatabaseDto | undefined
    entity?: EntityDto | undefined
    timeField?: FieldDto | undefined
    selectedFields : FieldDto[]

    where?:  FilterClause[] | undefined,
    params?: SqlParam[] | undefined,
    sql?:    SqlFilter | undefined,
}


export type ChartsMetaState = {
    editEntity: EditChartReqTemplate
    // БД
    databases: DatabaseDto[]

    // Загрузка/ошибки
    loading: LoadFlags
    errors:  ErrorFlags

    // КЭШИ, чтобы не дёргать сервер лишний раз
    databasesLoaded: boolean
    templatesById: Record<Guid, ChartReqTemplateDto>                 // dbId -> entityNames[]
    databasesById: Record<Guid, DatabaseDto>                 // dbId -> entityNames[]

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
        selectedFields: [],

        where:  undefined,
        params: undefined,
        sql:    undefined,
    },

    databases: [],
    loading: { databases: false, entities: false, fields: false },
    errors:  { databases: undefined, entities: undefined, fields: undefined },

    databasesLoaded: false,
    templatesById: {} as Record<Guid, ChartReqTemplateDto>,
    databasesById: {} as Record<Guid, DatabaseDto>,
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
        const st = getState().chartsMeta;

        if (!force && st.databasesLoaded && st.databases.length > 0) return;

        dispatch(setLoading({ key: 'databases', value: true }));
        const sub = dispatch(metadataApi.endpoints.getDatabases.initiate());
        try {
            const databases = (await sub.unwrap()) as DatabaseDto[];

            // только свои данные: список + флаг
            dispatch(setDatabases(databases));

            if(databases.length > 0 && !st.editEntity.databaseId) {
                const db = databases.at(0)!
                dispatch(setActiveDb(db))
                if(db.entities.length > 0){
                    const entity = db.entities.at(0)!
                    dispatch(setActiveEntity(entity))
                }

            }

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


        if (!db) throw new Error('Database does not exist');


        dispatch(setLoading({ key: 'entities', value: true }));
        const sub = dispatch(metadataApi.endpoints.getEntities.initiate());
        try {
            const data = (await sub.unwrap()) as EntityDto[];
            // только свои данные: entities + кэш
            dispatch(setEntities({dbId: db.id, entities: data}));

            dispatch(clearError('entities'));
        } catch (e: any) {
            console.log(e);
            // при ошибке — оставляем entities пустыми (fields уже были очищены при setActiveDb)
            dispatch(setEntities({dbId: db.id, entities: undefined}));
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed';
            dispatch(setError({ key: 'entities', error: msg }));
        } finally {
            dispatch(setLoading({ key: 'entities', value: false }));
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
        const st = getState().chartsMeta;
        const db: DatabaseDto | undefined = st.editEntity.database;
        const entityName: string | undefined = st.editEntity.entity?.name;

        if(db == undefined) throw Error("databaseId is undefined");
        if(entityName == undefined) throw Error("entity name is undefined");

        const entity = (args && (args as any).entity) || st.editEntity.entity;

        // только свои данные: если entity нет — очищаем fields
        if (!entity) {
            dispatch(setFields({dbId: db.id, entity: entity, fields: undefined}));
            return;
        }

        dispatch(setLoading({ key: 'fields', value: true }));

        const sub = dispatch(
            metadataApi.endpoints.getEntityFields.initiate({ entity: entity })
        );
        try {
            const data = (await sub.unwrap()) as FieldDto[];
            const list = data ?? [];

            // только свои данные: fields + кэш
             dispatch(setFields({dbId: db.id, entity: entity, fields: list}));
            //dispatch(cacheFieldsForEntity({ dbId, entity, fields: list }));

            // синхронизируем выбранные имена с наличием в списке полей
            const existing = new Set(list.map(f => f.name));
            dispatch(setFilterFields(st.editEntity.selectedFields.filter(n => existing.has(n.name))));

            dispatch(clearError('fields'));
        } catch (e: any) {
            // при ошибке — fields пустые
            dispatch(setFields({dbId: db.id, entity: entity, fields: undefined}));
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed';
            dispatch(setError({ key: 'fields', error: msg }));
        } finally {
            dispatch(setLoading({ key: 'fields', value: false }));
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
            state.editEntity.database = db

            state.editEntity.entity = state.editEntity.database.entities[0]
            state.editEntity.selectedFields = [] as FieldDto[]
        },

        setFields(state, action: PayloadAction<{dbId: Guid, entity: string, fields: FieldDto[] | undefined}>) {

            const dbId : Guid = action.payload.dbId;
            const db: DatabaseDto | undefined = state.databasesById[dbId];

            if(!db) throw Error("database is undefined");

            const entity: EntityDto | undefined = db.entities.find(e => e.name == action.payload.entity);

            if(!entity) throw Error("entity is undefined");


            entity.fields = action.payload.fields ?? []
        },

        setApplyTemplate(state, action: PayloadAction<EditChartReqTemplate>) {

            if(action.payload.database == undefined) throw Error("database is undefined");

              action.payload.entity = action.payload.database.entities.find(e => e.name == action.payload.entity?.name);;
              state.editEntity = action.payload;
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
            state.databases.forEach((db: DatabaseDto) => {
                state.databasesById[db.id] = db;
            });

        },
        setDatabasesLoaded(state, action: PayloadAction<boolean>) {
            state.databasesLoaded = action.payload
        },

        // --- Таблицы ---
        setEntities(state, action: PayloadAction<{dbId: Guid, entities: EntityDto[] | undefined}>) {

            const dbId : Guid = action.payload.dbId;
            const db: DatabaseDto | undefined = state.databasesById[dbId];

            if(db == undefined) throw Error("database is undefined");

            db.entities =  action.payload.entities ?? [];

        },
        setActiveEntity(state, action: PayloadAction<EntityDto | undefined>) {
            state.editEntity.entity = action.payload
        },
        clearBoundTemplate(state) {
            state.editEntity.id = undefined
        },


        // --- Выбор полей пользователем ---
        setFilterFields(state, action: PayloadAction<FieldDto[]>) {
            state.editEntity.selectedFields = action.payload
        },
        toggleFilterField(state, action: PayloadAction<FieldDto>) {
            const field = action.payload
            const set = new Set(state.editEntity.selectedFields)
            set.has(field) ? set.delete(field) : set.add(field)
            state.editEntity.selectedFields = Array.from(set)
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
            state.editEntity.entity = undefined
            state.editEntity.selectedFields = []
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
    setEntities, setActiveEntity,
    // Поля
    setFields,
    // Выбор полей
    setFilterFields, toggleFilterField,
    // Loading/Error
    setLoading, setError, clearError,
    // Сбросы
    clearBoundTemplate,
    resetEntitiesAndFields,

    clearAll,
    setEditEntityName,
    setEditEntityDesc,
    setApplyTemplate
} = chartsMetaSlice.actions

export default chartsMetaSlice.reducer

// ========================== СЕЛЕКТОРЫ ==========================
export const selectEditEntity     = (s: RootState) => s.chartsMeta.editEntity
export const selectDatabases     = (s: RootState) => s.chartsMeta.databases

export const selectEntities      = (s: RootState) => s.chartsMeta.editEntity.database?.entities

export const selectFields        = (s: RootState) => s.chartsMeta.editEntity?.entity?.fields

export const selectLoading       = (s: RootState) => s.chartsMeta.loading
export const selectErrors        = (s: RootState) => s.chartsMeta.errors

