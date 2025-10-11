import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import type { RootState } from '@/store/store'
import { notify } from '@app/lib/notify'
import { metadataApi } from '@chartsPage/metaData/shared/api/metadataApi'
import type { DatabaseDto } from '@chartsPage/metaData/shared/dtos/DatabaseDto'
import type { Guid } from '@app/lib/types/Guid'
import type { EntityDto } from '@chartsPage/metaData/shared/dtos/EntityDto'
import type { FieldDto } from '@chartsPage/metaData/shared/dtos/FieldDto'
import { setActiveTemplateSelectedFields } from '@chartsPage/template/store/chartsTemplatesSlice'

// ========================== ТИПЫ ==========================

type LoadKey = 'databases' | 'entities' | 'fields'
type LoadFlags = Record<LoadKey, boolean>
type ErrorFlags = Record<LoadKey, string | undefined>

// Новое: состояние загрузки для отдельной базы данных
export type DatabaseLoadingState = 'idle' | 'loading' | 'success' | 'error'

export type ChartsMetaState = {
    // БД
    databases: DatabaseDto[]

    // Загрузка/ошибки
    loading: LoadFlags
    errors: ErrorFlags

    // КЭШ, чтобы не дёргать сервер лишний раз
    databasesLoaded: boolean
    getDatabasesById: Record<Guid, DatabaseDto>

    // Новое: состояние загрузки каждой БД
    databaseLoadingStates: Record<Guid, DatabaseLoadingState>
}

const initialState: ChartsMetaState = {
    databases: [],
    loading: { databases: false, entities: false, fields: false },
    errors: { databases: undefined, entities: undefined, fields: undefined },

    databasesLoaded: false,
    getDatabasesById: {} as Record<Guid, DatabaseDto>,
    // Новое: инициализация статусов
    databaseLoadingStates: {} as Record<Guid, DatabaseLoadingState>,
}

// ========================== ASYNC THUNKS ==========================

/* ======================== БАЗА ДАННЫХ ======================== */
export const fetchDatabases = createAsyncThunk<
    void,
    { force?: boolean } | void,
    { state: RootState }
>(
    'chartsMeta/fetchDatabases',
    async (args, { getState, dispatch }) => {
        const force = !!(args && (args as any).force)
        const stChartsMeta = getState().chartsMeta

        if (!force && stChartsMeta.databasesLoaded && stChartsMeta.databases.length > 0) return

        dispatch(setDatabasesLoading({ key: 'databases', value: true }))
        const sub = dispatch(metadataApi.endpoints.getDatabases.initiate())
        try {
            const databases = (await notify.run(
                sub.unwrap(),
                {
                    loading: { text: 'Загружаю базы…' },
                    success: { text: 'Базы загружены', toastOptions: { duration: 700 } },
                    error: { text: 'Не удалось загрузить базы', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-databases' }
            )) as DatabaseDto[]

            // Только новое: устанавливаем статус success для каждой БД
            databases.forEach((db) => {
                dispatch(setDatabaseLoadingState({ dbId: db.id, state: 'success' }))
            })

            dispatch(setDatabases(databases))
            dispatch(setDatabasesLoaded(true))
            dispatch(clearDatabasesError('databases'))
        } catch (e: any) {
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed'
            dispatch(setDatabasesError({ key: 'databases', error: msg }))
        } finally {
            dispatch(setDatabasesLoading({ key: 'databases', value: false }))
            sub.unsubscribe()
        }
    }
)

/* ======================== СПИСОК ТАБЛИЦ ======================== */
export const fetchEntities = createAsyncThunk<
    void,
    void,
    { state: RootState }
>(
    'chartsMeta/fetchEntities',
    async (_args, { getState, dispatch }) => {
        const stChartsTemplates = getState().chartsTemplates
        const db = stChartsTemplates.activeTemplate.database

        if (!db) throw new Error('Database does not exist')

        // Только новое: статус loading
        dispatch(setDatabaseLoadingState({ dbId: db.id, state: 'loading' }))

        dispatch(setDatabasesLoading({ key: 'entities', value: true }))
        const sub = dispatch(metadataApi.endpoints.getEntities.initiate())
        try {
            const data = (await notify.run(
                sub.unwrap(),
                {
                    loading: { text: 'Загружаю таблицы…' },
                    success: { text: 'Таблицы загружены', toastOptions: { duration: 700 } },
                    error: { text: 'Не удалось загрузить таблицы', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-entities' }
            )) as EntityDto[]

            dispatch(setEntitiesDatabase({ dbId: db.id, entities: data }))

            // Только новое: статус success
            dispatch(setDatabaseLoadingState({ dbId: db.id, state: 'success' }))

            dispatch(clearDatabasesError('entities'))
        } catch (e: any) {
            dispatch(setEntitiesDatabase({ dbId: db.id, entities: undefined }))

            // Только новое: статус error
            dispatch(setDatabaseLoadingState({ dbId: db.id, state: 'error' }))

            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed'
            dispatch(setDatabasesError({ key: 'entities', error: msg }))
        } finally {
            dispatch(setDatabasesLoading({ key: 'entities', value: false }))
        }
    }
)

/* ======================== ПОЛЯ СУЩНОСТИ ======================== */
export const fetchEntityFields = createAsyncThunk<
    void,
    { entity?: EntityDto } | void,
    { state: RootState }
>(
    'chartsMeta/fetchEntityFields',
    async (args, { getState, dispatch }) => {
        const stChartsTemplates = getState().chartsTemplates

        const db: DatabaseDto | undefined = stChartsTemplates.activeTemplate.database
        const entityName: string | undefined = stChartsTemplates.activeTemplate.entity?.name

        if (db == undefined) throw Error('databaseId is undefined')
        if (entityName == undefined) throw Error('entity name is undefined')

        const entity = (args && (args as any).entity) || stChartsTemplates.activeTemplate.entity

        if (!entity) {
            dispatch(setFieldsDatabase({ dbId: db.id, entity: entity, fields: undefined }))
            return
        }

        // Только новое: статус loading
        dispatch(setDatabaseLoadingState({ dbId: db.id, state: 'loading' }))

        dispatch(setDatabasesLoading({ key: 'fields', value: true }))

        const sub = dispatch(
            metadataApi.endpoints.getEntityFields.initiate({ entity: entity })
        )
        try {
            const data = (await notify.run(
                sub.unwrap(),
                {
                    loading: { text: 'Загружаю поля…' },
                    success: { text: 'Поля загружены', toastOptions: { duration: 700 } },
                    error: { text: 'Не удалось загрузить поля', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-fields' }
            )) as FieldDto[]

            const list = data ?? []

            dispatch(setFieldsDatabase({ dbId: db.id, entity: entity, fields: list }))

            // Только новое: статус success
            dispatch(setDatabaseLoadingState({ dbId: db.id, state: 'success' }))

            const existing = new Set(list.map((f) => f.name))
            dispatch(
                setActiveTemplateSelectedFields(
                    stChartsTemplates.activeTemplate.selectedFields.filter((n) => existing.has(n.name))
                )
            )

            dispatch(clearDatabasesError('fields'))
        } catch (e: any) {
            dispatch(setFieldsDatabase({ dbId: db.id, entity: entity, fields: undefined }))

            // Только новое: статус error
            dispatch(setDatabaseLoadingState({ dbId: db.id, state: 'error' }))

            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed'
            dispatch(setDatabasesError({ key: 'fields', error: msg }))
        } finally {
            dispatch(setDatabasesLoading({ key: 'fields', value: false }))
        }
    }
)

// ========================== SLICE ==========================

const chartsMetaSlice = createSlice({
    name: 'chartsMeta',
    initialState,
    reducers: {
        setFieldsDatabase(
            state,
            action: PayloadAction<{ dbId: Guid; entity: string; fields: FieldDto[] | undefined }>
        ) {
            const dbId: Guid = action.payload.dbId
            const db: DatabaseDto | undefined = state.getDatabasesById[dbId]

            if (!db) throw Error('database is undefined')

            const entity: EntityDto | undefined = db.entities.find((e) => e.name == action.payload.entity)

            if (!entity) throw Error('entity is undefined')

            entity.fields = action.payload.fields ?? []
        },

        setDatabases(state, action: PayloadAction<DatabaseDto[]>) {
            state.databases = action.payload ?? []
            state.databases.forEach((db: DatabaseDto) => {
                state.getDatabasesById[db.id] = db
            })
        },

        setDatabasesLoaded(state, action: PayloadAction<boolean>) {
            state.databasesLoaded = action.payload
        },

        // --- Таблицы ---
        setEntitiesDatabase(
            state,
            action: PayloadAction<{ dbId: Guid; entities: EntityDto[] | undefined }>
        ) {
            const dbId: Guid = action.payload.dbId
            const db: DatabaseDto | undefined = state.getDatabasesById[dbId]

            if (db == undefined) throw Error('database is undefined')

            db.entities = action.payload.entities ?? []
        },

        // Новое: установка статуса загрузки для БД
        setDatabaseLoadingState(
            state,
            action: PayloadAction<{ dbId: Guid; state: DatabaseLoadingState }>
        ) {
            const { dbId, state: loadingState } = action.payload
            state.databaseLoadingStates[dbId] = loadingState
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
    setDatabaseLoadingState, // Новое
    setDatabasesLoading,
    setDatabasesError,
    clearDatabasesError,
} = chartsMetaSlice.actions

// ========================== СЕЛЕКТОРЫ ==========================
export const selectDatabases = (s: RootState) => s.chartsMeta.databases
export const selectGetDatabasesById = (s: RootState) => s.chartsMeta.getDatabasesById
export const selectDatabasesLoaded = (s: RootState) => s.chartsMeta.databasesLoaded

export const selectChartsMetaLoading = (s: RootState) => s.chartsMeta.loading
export const selectErrors = (s: RootState) => s.chartsMeta.errors

// Новые селекторы для статуса загрузки БД
export const selectDatabaseLoadingStates = (s: RootState) => s.chartsMeta.databaseLoadingStates

export const selectDatabaseLoadingState = (dbId: Guid) => (s: RootState): DatabaseLoadingState => {
    const state = s.chartsMeta.databaseLoadingStates[dbId]
    return state ?? 'idle'
}

export const selectIsDatabaseLoading = (dbId: Guid) => (s: RootState): boolean => {
    const state = s.chartsMeta.databaseLoadingStates[dbId]
    return state === 'loading'
}

export const selectIsDatabaseError = (dbId: Guid) => (s: RootState): boolean => {
    const state = s.chartsMeta.databaseLoadingStates[dbId]
    return state === 'error'
}

export const selectIsDatabaseSuccess = (dbId: Guid) => (s: RootState): boolean => {
    const state = s.chartsMeta.databaseLoadingStates[dbId]
    return state === 'success'
}

// Config: localStorage для persistent (items), transform фильтрует transient
const chartsMetaPersistConfig = {
    key: 'chartsMeta',
    storage,
    whitelist: [],
};

// Оборачиваем reducer (без изменений логики)
export const chartsMetaReducer = persistReducer(chartsMetaPersistConfig, chartsMetaSlice.reducer);
