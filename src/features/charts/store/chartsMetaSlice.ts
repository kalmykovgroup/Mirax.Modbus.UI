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
 //   activeEntity?: string | undefined

    // Поля выбранной таблицы
    fields: FieldMetaDto[]
    // Поля, выбранные пользователем (для построения/фильтрации)
  //  filterFields: string[]

    // Загрузка/ошибки
    loading: LoadFlags
    errors:  ErrorFlags

    // КЭШИ, чтобы не дёргать сервер лишний раз
    databasesLoaded: boolean
    entitiesByDb: Record<Guid, string[]>                 // db -> entityNames[]
    fieldsByEntity: Record<string, FieldMetaDto[]>         // entity -> fieldMeta[]

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
    fieldsByEntity: {}
}

// ========================== THUNKS ==========================

// 1) Список БД
export const fetchDatabases = createAsyncThunk<
    void,
    { force?: boolean } | void,
    { state: RootState }
>(
    'chartsMeta/fetchDatabases',
    async (args, { getState, dispatch }) => {
        const force = !!(args && (args as any).force)
        const st = getState().chartsMeta

        if (!force && st.databasesLoaded && st.databases.length > 0) {
            // Уже загружено — не трогаем
            return
        }

        dispatch(setLoading({ key: 'databases', value: true }))
        const sub = dispatch(metadataApi.endpoints.getDatabases.initiate())
        try {
            // бекенд возвращает массив строк
            console.log("Запрос на получения баз данных")
            const databases = await sub.unwrap() as DatabaseDto[]

            dispatch(setDatabases(databases))
            dispatch(setDatabasesLoaded(true))

            // если активная БД не выбрана — выберем первую
            if (!st.editEntity.database && databases.length > 0) {
                const db = databases[0]!
                dispatch(setActiveDb(db))

                // При смене активной БД — сразу отдадим кэш сущностей (если есть)
                const cachedEntities = getState().chartsMeta.entitiesByDb[db.id]
                if (cachedEntities) {
                    dispatch(setEntities(cachedEntities))
                    if (!getState().chartsMeta.editEntity.entity && cachedEntities.length > 0) {
                        const ent = cachedEntities[0]!

                        dispatch(setActiveEntity(ent))

                        const cachedFields = getState().chartsMeta.fieldsByEntity[ent]
                        if (cachedFields) {
                            dispatch(setFields(cachedFields))
                            const existingNames = new Set(cachedFields.map(f => f.name))
                            dispatch(setFilterFields(
                                getState().chartsMeta.editEntity.fields.filter(n => existingNames.has(n))
                            ))
                        }
                    }
                }
            }

            dispatch(clearError('databases'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setError({ key: 'databases', error: msg }))
        } finally {
            dispatch(setLoading({ key: 'databases', value: false }))
            sub.unsubscribe()
        }
    }
)

// 2) Список таблиц (entities) для активной БД
export const fetchEntities = createAsyncThunk<
    void,
    { force?: boolean } | void,
    { state: RootState }
>(
    'chartsMeta/fetchEntities',
    async (args, { getState, dispatch }) => {
        const st = getState().chartsMeta

        if(st.editEntity.database == undefined) return;

        const db : DatabaseDto = st.editEntity.database
        const force = !!(args && (args as any).force)

        if ((args as any)?.db && (args as any).db !== st.editEntity.database) {
            // явное переключение БД
            dispatch(setActiveDb((args as any).db))
            dispatch(resetEntitiesAndFields())
        }

        if (!db) {
            // нет активной БД — очищаем
            dispatch(setEntities([]))
            return
        }

        // если есть кэш и не force — вернём кэш
        const cached = st.entitiesByDb[db.id]
        if (!force && cached) {
            dispatch(setEntities(cached))
            if (!getState().chartsMeta.editEntity.entity && cached.length > 0) {
                const ent = cached[0]!
                dispatch(setActiveEntity(ent))

                const cachedFields = getState().chartsMeta.fieldsByEntity[ent]
                if (cachedFields) {
                    dispatch(setFields(cachedFields))
                    const existingNames = new Set(cachedFields.map(f => f.name))
                    dispatch(setFilterFields(
                        getState().chartsMeta.editEntity.fields.filter(n => existingNames.has(n))
                    ))
                }
            }
            return
        }

        dispatch(setLoading({ key: 'entities', value: true }))
        const sub = dispatch(metadataApi.endpoints.getEntities.initiate())
        try {
            console.log("Запрос на получения таблиц для базы " + db.name)
            const data = await sub.unwrap() as EntityMetaDto[]
            const names = (data ?? []).map(x => (x as any).name as string).filter(Boolean)
            dispatch(setEntities(names))
            dispatch(cacheEntitiesForDb({ databaseId: db.id, entities: names }))

            if (!getState().chartsMeta.editEntity.entity && names.length > 0) {
                dispatch(setActiveEntity(names[0]))
            }

            dispatch(clearError('entities'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setError({ key: 'entities', error: msg }))
        } finally {
            dispatch(setLoading({ key: 'entities', value: false }))
            sub.unsubscribe()
        }
    }
)

// 3) Поля для сущности
export const fetchEntityFields = createAsyncThunk<
    void,
    { entity?: string; force?: boolean } | void,
    { state: RootState }
>(
    'chartsMeta/fetchEntityFields',
    async (args, { getState, dispatch }) => {
        const st = getState().chartsMeta
        const entity = (args && (args as any).entity) || st.editEntity.entity
        const force = !!(args && (args as any).force)

        if (!entity) {
            dispatch(setFields([]))
            return
        }

        // если запрошена другая сущность — переключим активную и сбросим поля
        if (entity !== st.editEntity.entity) {
            dispatch(setActiveEntity(entity))
            dispatch(resetFieldsOnly())
        }

        // кэш
        const cached = st.fieldsByEntity[entity]
        if (!force && cached) {
            dispatch(setFields(cached))
            const existing = new Set(cached.map(f => f.name))
            dispatch(setFilterFields(getState().chartsMeta.editEntity.fields.filter(n => existing.has(n))))
            return
        }

        dispatch(setLoading({ key: 'fields', value: true }))
        const sub = dispatch(metadataApi.endpoints.getEntityFields.initiate({ entity }))
        try {
            console.log("Запрос на получения полей для таблицы " + entity + " из базы " + (st.editEntity?.database?.name  ?? "unknow"))
            const data = await sub.unwrap() as FieldMetaDto[]
            const list = data ?? []
            dispatch(setFields(list))
            dispatch(cacheFieldsForEntity({ entity, fields: list }))
            // вычищаем выбранные поля, которых больше нет
            const existing = new Set(list.map(f => f.name))
            dispatch(setFilterFields(getState().chartsMeta.editEntity.fields.filter(n => existing.has(n))))
            dispatch(clearError('fields'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setError({ key: 'fields', error: msg }))
        } finally {
            dispatch(setLoading({ key: 'fields', value: false }))
            sub.unsubscribe()
        }
    }
)



// ========================== SLICE ==========================
const chartsMetaSlice = createSlice({
    name: 'chartsMeta',
    initialState,
    reducers: {
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
        setActiveDb(state, action: PayloadAction<DatabaseDto>) {
            state.editEntity.database = action.payload
            state.editEntity.databaseId = action.payload.id
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
        cacheEntitiesForDb(state, action: PayloadAction<{ databaseId: Guid; entities: string[] }>) {
            const { databaseId, entities } = action.payload
            if (!databaseId) return
            state.entitiesByDb[databaseId] = entities ?? []
        },
        clearBoundTemplate(state) {
            state.editEntity.id = undefined
        },

        // --- Поля ---
        setFields(state, action: PayloadAction<FieldMetaDto[]>) {
            state.fields = action.payload ?? []
        },
        cacheFieldsForEntity(state, action: PayloadAction<{ entity: string; fields: FieldMetaDto[] }>) {
            const { entity, fields } = action.payload
            if (!entity) return
            state.fieldsByEntity[entity] = fields ?? []
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

