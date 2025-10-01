// src/store/slices/chartsTemplatesSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type {Guid} from "@app/lib/types/Guid.ts";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/lib/storage";
import type {RootState} from "@/store/store.ts";
import {notify} from "@app/lib/notify.ts";
import type {ChartReqTemplateDto} from "@charts/template/shared/dtos/ChartReqTemplateDto.ts";
import type {DatabaseDto} from "@charts/metaData/shared/dtos/DatabaseDto.ts";
import type {EntityDto} from "@charts/metaData/shared/dtos/EntityDto.ts";
import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";
import type {FilterClause} from "@charts/template/shared/dtos/FilterClause.ts";
import type {SqlParam} from "@charts/template/shared/dtos/SqlParam.ts";
import type {SqlFilter} from "@charts/template/shared/dtos/SqlFilter.ts";
import {chartReqTemplatesApi} from "@charts/template/shared/api/chartReqTemplatesApi.ts";
import type {
    CreateChartReqTemplateRequest
} from "@charts/template/shared/dtos/requests/CreateChartReqTemplateRequest.ts";
import type {
    UpdateChartReqTemplateRequest
} from "@charts/template/shared/dtos/requests/UpdateChartReqTemplateRequest.ts";

// ==== общий helper для единообразного закрытия ====
function safeUnsubscribe(sub: any) {
    if (!sub) return
    if (typeof sub.unsubscribe === 'function') sub.unsubscribe() // для query
    else if (typeof sub.reset === 'function') sub.reset()        // для mutation
}

// ==== helpers/state types ====
type LoadKey = 'list' | 'create' | 'update' | 'delete'
type LoadingFlags = Record<LoadKey, boolean>
type ErrorFlags   = Record<LoadKey, string | undefined>
const getId = (x: ChartReqTemplateDto) => (x as any).id as string // при ином поле — поменяй здесь

export type NewChartReqTemplate = {
    id?: Guid | undefined
    name: string | undefined
    description?: string | undefined


    //Это исходный при старте графика
    from?: Date | undefined
    to?: Date | undefined

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

export type ChartsTemplatesState = {
    activeTemplate: NewChartReqTemplate | ChartReqTemplateDto

    items: ChartReqTemplateDto[]
    listLoaded: boolean
    loading: LoadingFlags
    errors:  ErrorFlags,
    getTemplateById: Record<Guid, ChartReqTemplateDto>
}


const initialState: ChartsTemplatesState = {
    activeTemplate: {} as NewChartReqTemplate,

    items: [],
    listLoaded: false,
    loading: { list: false, create: false, update: false, delete: false },
    errors:  { list: undefined, create: undefined, update: undefined, delete: undefined },
    getTemplateById: {}
}

// ==== thunks в едином стиле ====

export const fetchChartReqTemplates = createAsyncThunk<
    void,
    { force?: boolean } | undefined,
    { state: RootState  }
>(
    'chartsTemplates/fetchAll',
    async (args, { getState, dispatch }) => {
        const force = !!(args && (args as any).force)
        const stateChartsTemplates = getState().chartsTemplates
        if (!force && stateChartsTemplates.listLoaded && stateChartsTemplates.items.length > 0) return

        dispatch(setChartTemplatesLoading({ key: 'list', value: true }))
        const sub = dispatch(chartReqTemplatesApi.endpoints.getTemplates.initiate())
        try {

            const data = await notify.run(
                sub.unwrap(),
                {
                    loading: { text: 'Загружаю шаблоны…' },
                    success: { text: 'Шаблоны загружены', toastOptions: { duration: 700 } },
                    error:   { text: 'Не удалось загрузить шаблоны', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-fields' } // чтобы не плодить дубли при повторных кликах
            ) as ChartReqTemplateDto[];

            const { getDatabasesById } = getState().chartsMeta; // твой словарь БД по id


            const normalized = data.map(it => {
                const db = it.database ?? getDatabasesById[it.databaseId];
                // если нашли БД — возвращаем новый объект с подставленной database
                return db ? { ...it, database: db } : { ...it };
            });

            dispatch(setTemplates(normalized));
            dispatch(setChartTemplatesListLoaded(true))
            dispatch(clearChartTemplatesError('list'))
        } catch (e: any) {
            console.log(e)

            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setChartTemplatesError({ key: 'list', error: msg }))
        } finally {

            dispatch(setChartTemplatesLoading({ key: 'list', value: false }))
            safeUnsubscribe(sub)
        }
    }
)

// 2) создать (везде один и тот же шаблон finally с safeUnsubscribe)
export const createChartReqTemplate = createAsyncThunk<
    void,
    CreateChartReqTemplateRequest,
    { state: RootState }
>(
    'chartsTemplates/create',
    async (request, { dispatch }) => {
        dispatch(setChartTemplatesLoading({ key: 'create', value: true }))
        const sub = dispatch(chartReqTemplatesApi.endpoints.createTemplate.initiate(request))
        try {
            const created = await notify.run(
                sub.unwrap(),
                {
                    loading: { text: 'Создание шаблона…' },
                    success: { text: 'Шаблон успешно добавлен', toastOptions: { duration: 700 } },
                    error:   { text: 'Не удалось создать шаблон', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-fields' } // чтобы не плодить дубли при повторных кликах
            ) as ChartReqTemplateDto;

            if (created) dispatch(upsertTemplate(created))
            dispatch(clearChartTemplatesError('create'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setChartTemplatesError({ key: 'create', error: msg }))
        } finally {
            dispatch(setChartTemplatesLoading({ key: 'create', value: false }))
            safeUnsubscribe(sub)
        }
    }
)

// 3) обновить
export const updateChartReqTemplate = createAsyncThunk<
    void,
    UpdateChartReqTemplateRequest ,
    { state: RootState }
>(
    'chartsTemplates/update',
    async (request: UpdateChartReqTemplateRequest, { dispatch }) => {


        dispatch(setChartTemplatesLoading({ key: 'update', value: true }))

        const sub = dispatch(chartReqTemplatesApi.endpoints.updateTemplate.initiate(request))
        try {

            const updated = await notify.run(
                sub.unwrap(),
                {
                    loading: { text: 'Обновление шаблона…' },
                    success: { text: 'Шаблон обновлен успешно', toastOptions: { duration: 700 } },
                    error:   { text: 'Не удалось обновить шаблон', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-fields' } // чтобы не плодить дубли при повторных кликах
            ) as ChartReqTemplateDto;


            if (updated) dispatch(upsertTemplate(updated))
            dispatch(clearChartTemplatesError('update'))
        } catch (e: any) {
            console.log(e)
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setChartTemplatesError({ key: 'update', error: msg }))
        } finally {
            dispatch(setChartTemplatesLoading({ key: 'update', value: false }))
            safeUnsubscribe(sub)
        }
    }
)

// 4) удалить
export const deleteChartReqTemplate = createAsyncThunk<
    void,
    { id: string },
    { state: RootState }
>(
    'chartsTemplates/delete',
    async ({ id }, { dispatch }) => {
        dispatch(setChartTemplatesLoading({ key: 'delete', value: true }))
        const sub = dispatch(chartReqTemplatesApi.endpoints.deleteTemplate.initiate(id))
        try {
             await notify.run(
                sub.unwrap(),
                {
                    loading: { text: 'Удаление шаблона…' },
                    success: { text: 'Удаление прошло без ошибок!', toastOptions: { duration: 700 } },
                    error:   { text: 'Во время удаления произошла ошибка!', toastOptions: { duration: 3000 } },
                },
                { id: 'fetch-fields' } // чтобы не плодить дубли при повторных кликах
            );


            dispatch(removeTemplate(id))
            dispatch(clearChartTemplatesError('delete'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setChartTemplatesError({ key: 'delete', error: msg }))
            console.log(e?.data?.errorMessage ?? 'Request failed')
        } finally {
            dispatch(setChartTemplatesLoading({ key: 'delete', value: false }))
            safeUnsubscribe(sub)
        }
    }
)

export const applyTemplate = createAsyncThunk<
    void,
    NewChartReqTemplate,
    { state: RootState }
>('chartsMeta/applyTemplate', (tpl, { getState, dispatch }) => {

    const state = getState();
    const dbId = tpl.database?.id ?? tpl.databaseId;
    if (!dbId) throw new Error('databaseId is undefined');

    const db = state.chartsMeta.getDatabasesById[dbId];     // ← другой slice
    if (!db) throw new Error('database is undefined');

    const entityName = tpl.entity?.name;
    const entity = entityName ? db.entities.find(e => e.name === entityName) : undefined;

    const resolved = { ...tpl, database: db, entity }
    dispatch(setActiveTemplate(resolved))

});



// ==== slice ====
const chartsTemplatesSlice = createSlice({
    name: 'chartsTemplates',
    initialState,
    reducers: {
        setActiveTemplate(state, action: PayloadAction<NewChartReqTemplate | ChartReqTemplateDto>) {
            state.activeTemplate = action.payload
        },
        setTemplateDatabase(state, action: PayloadAction<{itemId: Guid, database: DatabaseDto}>) {
            const template = state.getTemplateById[action.payload.itemId]
            if(template !== undefined) {
                template.database = action.payload.database;
            }
        },
        setTemplates(state, action: PayloadAction<ChartReqTemplateDto[]>) {
            state.items = action.payload;
            state.items.forEach(item => {
                state.getTemplateById[item.id] = item
            })
        },
        upsertTemplate(state, action: PayloadAction<ChartReqTemplateDto>) {
            const item = action.payload
            const id = getId(item)
            const i = state.items.findIndex(x => getId(x) === id)
            if (i >= 0){
                state.items[i] = item
                state.getTemplateById[item.id] = item
            }
            else{
                state.items.unshift(item)
                state.getTemplateById[item.id] = item
            }
        },
        removeTemplate(state, action: PayloadAction<string>) {
            state.items = state.items.filter(x => getId(x) !== action.payload)
            state.getTemplateById = {}
            state.items.forEach(item => {
                state.getTemplateById[item.id] = item
            })
        },

        setChartTemplatesListLoaded(state, action: PayloadAction<boolean>) {
            state.listLoaded = action.payload
        },

        setChartTemplatesLoading(state, action: PayloadAction<{ key: LoadKey; value: boolean }>) {
            const { key, value } = action.payload
            state.loading[key] = value
            if (value) state.errors[key] = undefined
        },
        setChartTemplatesError(state, action: PayloadAction<{ key: LoadKey; error?: string }>) {
            const { key, error } = action.payload
            state.errors[key] = error ?? 'Unknown error'
        },
        clearChartTemplatesError(state, action: PayloadAction<LoadKey>) {
            state.errors[action.payload] = undefined
        },

        clearAllTemplateData() {
            return { ...initialState }
        },


        setActiveTemplateDb(state, action: PayloadAction<DatabaseDto>) {
            const db = action.payload
            state.activeTemplate.databaseId = db.id
            state.activeTemplate.database = db

            state.activeTemplate.entity = state.activeTemplate.database.entities[0]
            state.activeTemplate.selectedFields = [] as FieldDto[]
        },

        setActiveTemplateEntity(state, action: PayloadAction<EntityDto | undefined>) {
            state.activeTemplate.entity = action.payload
        },
        clearBoundActiveTemplate(state) {
            state.activeTemplate.id = undefined
        },

        setActiveTemplateWhere(state, action: PayloadAction<FilterClause[] | undefined>) {
            state.activeTemplate.where = action.payload; // Immer внутри RTK, можно «мутировать»
        },
        setActiveTemplateSql(state, action: PayloadAction<SqlFilter | undefined>) {
            state.activeTemplate.sql = action.payload;
        },
        setActiveTemplateParams(state, action: PayloadAction<SqlParam[] | undefined>) {
            state.activeTemplate.params = action.payload;
        },
        setActiveTemplateTimeField(state, action: PayloadAction<FieldDto | undefined>) {
            state.activeTemplate.timeField = action.payload;
        },

        // --- БД ---
        setActiveTemplateName(state, action: PayloadAction<string>) {
            state.activeTemplate.name = action.payload
        },
        setActiveTemplateDesc(state, action: PayloadAction<string>) {
            state.activeTemplate.description = action.payload
        },
        setActiveTemplateFrom(state, action: PayloadAction<Date | undefined>) {
            state.activeTemplate.from = action.payload
        },
        setActiveTemplateTo(state, action: PayloadAction<Date | undefined>) {
            state.activeTemplate.to = action.payload
        },

        // --- Выбор полей пользователем ---
        setActiveTemplateSelectedFields(state, action: PayloadAction<FieldDto[]>) {
            state.activeTemplate.selectedFields = action.payload
        },
        toggleActiveTemplateSelectedField(state, action: PayloadAction<FieldDto>) {
            const field = action.payload
            const set = new Set(state.activeTemplate.selectedFields)
            set.has(field) ? set.delete(field) : set.add(field)
            state.activeTemplate.selectedFields = Array.from(set)
        },

        // --- Сбросы зависимостей ---
        resetActiveTemplateEntitiesAndFields(state) {
            state.activeTemplate.entity = undefined
            state.activeTemplate.selectedFields = []
        },

        resetActiveTemplateOnLoad(state) {
            // Сбрасываем только activeTemplate (имитируем session: сбрасываем на рефреше)
            state.activeTemplate = {} as NewChartReqTemplate; // Или initialState.activeTemplate
            state.loading = { list: false, create: false, update: false, delete: false };
            state.errors = { list: undefined, create: undefined, update: undefined, delete: undefined };
        },
    },
})

export const {
    setActiveTemplate,
    setTemplateDatabase,
    setTemplates,
    upsertTemplate,
    removeTemplate,
    setChartTemplatesListLoaded,
    setChartTemplatesLoading,
    setChartTemplatesError,
    clearChartTemplatesError,
    setActiveTemplateEntity,
    setActiveTemplateDb,
    setActiveTemplateTimeField,
    setActiveTemplateSelectedFields, toggleActiveTemplateSelectedField,
    // Loading/Error
    // Сбросы
    clearBoundActiveTemplate,
    resetActiveTemplateEntitiesAndFields,
    setActiveTemplateWhere,
    setActiveTemplateSql,
    setActiveTemplateParams,
    clearAllTemplateData,
    setActiveTemplateName,
    setActiveTemplateDesc,
    setActiveTemplateFrom,
    setActiveTemplateTo,
    resetActiveTemplateOnLoad
} = chartsTemplatesSlice.actions


export const selectEntities      = (s: RootState) => s.chartsTemplates.activeTemplate.database?.entities
export const selectActiveEntity      = (s: RootState) => s.chartsTemplates.activeTemplate.entity

export const selectFields        = (s: RootState) => s.chartsTemplates.activeTemplate?.entity?.fields
export const selectActiveTimeField        = (s: RootState) => s.chartsTemplates.activeTemplate.timeField
export const selectSelectedFields        = (s: RootState) => s.chartsTemplates.activeTemplate.selectedFields

export const selectActiveDatabase     = (s: RootState) => s.chartsTemplates.activeTemplate.database

export const selectActiveTemplate= (state: RootState) => state.chartsTemplates.activeTemplate;
// ==== selectors ====
export const selectChartReqTemplates        = (s: RootState) => s.chartsTemplates.items
export const selectChartReqTemplatesLoading = (s: RootState) => s.chartsTemplates.loading
export const selectChartReqTemplatesErrors  = (s: RootState) => s.chartsTemplates.errors
export const selectChartReqTemplatesLoaded  = (s: RootState) => s.chartsTemplates.listLoaded


// Config: localStorage для persistent (items), transform фильтрует transient
const templatesPersistConfig = {
    key: 'chartsTemplates',
    storage,
    whitelist: []
};

// Оборачиваем reducer (без изменений логики)
export const chartsTemplatesReducer = persistReducer(templatesPersistConfig, chartsTemplatesSlice.reducer);