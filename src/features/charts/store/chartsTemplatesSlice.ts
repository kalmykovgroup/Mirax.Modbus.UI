// src/store/slices/chartsTemplatesSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store/types'
import { chartReqTemplatesApi } from '@charts/shared/api/chartReqTemplatesApi'
import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto'

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

export type ChartsTemplatesState = {
    items: ChartReqTemplateDto[]
    listLoaded: boolean
    loading: LoadingFlags
    errors:  ErrorFlags
}

const initialState: ChartsTemplatesState = {
    items: [],
    listLoaded: false,
    loading: { list: false, create: false, update: false, delete: false },
    errors:  { list: undefined, create: undefined, update: undefined, delete: undefined },
}

// ==== thunks в едином стиле ====

// 1) список шаблонов (с force + кеш-флагом и обязательным safeUnsubscribe)
export const fetchChartReqTemplates = createAsyncThunk<
    void,
    { force?: boolean } | void,
    { state: RootState }
>(
    'chartsTemplates/fetchAll',
    async (args, { getState, dispatch }) => {
        const force = !!(args && (args as any).force)
        const st = getState().chartsTemplates
        if (!force && st.listLoaded && st.items.length > 0) return

        dispatch(setLoading({ key: 'list', value: true }))
        const sub = dispatch(chartReqTemplatesApi.endpoints.getTemplates.initiate())
        try {
            const data = await sub.unwrap()
            dispatch(setTemplates(data ?? []))
            dispatch(setListLoaded(true))
            dispatch(clearError('list'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setError({ key: 'list', error: msg }))
        } finally {
            dispatch(setLoading({ key: 'list', value: false }))
            safeUnsubscribe(sub)
        }
    }
)

// 2) создать (везде один и тот же шаблон finally с safeUnsubscribe)
export const createChartReqTemplate = createAsyncThunk<
    void,
    ChartReqTemplateDto,
    { state: RootState }
>(
    'chartsTemplates/create',
    async (body, { dispatch }) => {
        dispatch(setLoading({ key: 'create', value: true }))
        const sub = dispatch(chartReqTemplatesApi.endpoints.createTemplate.initiate(body))
        try {
            const created = await sub.unwrap()
            if (created) dispatch(upsertTemplate(created))
            dispatch(clearError('create'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setError({ key: 'create', error: msg }))
        } finally {
            dispatch(setLoading({ key: 'create', value: false }))
            safeUnsubscribe(sub)
        }
    }
)

// 3) обновить
export const updateChartReqTemplate = createAsyncThunk<
    void,
    { body: ChartReqTemplateDto },
    { state: RootState }
>(
    'chartsTemplates/update',
    async (args, { dispatch }) => {
        dispatch(setLoading({ key: 'update', value: true }))

        const objectRequest : { body: ChartReqTemplateDto } = (args && (args as {body: ChartReqTemplateDto}))

        const sub = dispatch(chartReqTemplatesApi.endpoints.updateTemplate.initiate(objectRequest))
        try {
            const updated = await sub.unwrap()
            if (updated) dispatch(upsertTemplate(updated))
            dispatch(clearError('update'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setError({ key: 'update', error: msg }))
        } finally {
            dispatch(setLoading({ key: 'update', value: false }))
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
        dispatch(setLoading({ key: 'delete', value: true }))
        const sub = dispatch(chartReqTemplatesApi.endpoints.deleteTemplate.initiate({ id }))
        try {
            await sub.unwrap()
            dispatch(removeTemplate(id))
            dispatch(clearError('delete'))
        } catch (e: any) {
            const msg = e?.data?.errorMessage ?? (typeof e?.data === 'string' ? e.data : undefined) ?? e?.message ?? 'Request failed'
            dispatch(setError({ key: 'delete', error: msg }))
            console.log(e?.data?.errorMessage ?? 'Request failed')
        } finally {
            dispatch(setLoading({ key: 'delete', value: false }))
            safeUnsubscribe(sub)
        }
    }
)

// ==== slice ====
const chartsTemplatesSlice = createSlice({
    name: 'chartsTemplates',
    initialState,
    reducers: {
        setTemplates(state, action: PayloadAction<ChartReqTemplateDto[]>) {
            state.items = action.payload ?? []
        },
        upsertTemplate(state, action: PayloadAction<ChartReqTemplateDto>) {
            const item = action.payload
            const id = getId(item)
            const i = state.items.findIndex(x => getId(x) === id)
            if (i >= 0) state.items[i] = item
            else state.items.unshift(item)
        },
        removeTemplate(state, action: PayloadAction<string>) {
            state.items = state.items.filter(x => getId(x) !== action.payload)
        },

        setListLoaded(state, action: PayloadAction<boolean>) {
            state.listLoaded = action.payload
        },

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
            state.errors[action.payload] = undefined
        },

        clearAll() {
            return { ...initialState }
        },
    },
})

export const {
    setTemplates,
    upsertTemplate,
    removeTemplate,
    setListLoaded,
    setLoading,
    setError,
    clearError,
    clearAll,
} = chartsTemplatesSlice.actions

export default chartsTemplatesSlice.reducer

// ==== selectors ====
export const selectChartReqTemplates        = (s: RootState) => s.chartsTemplates.items
export const selectChartReqTemplatesLoading = (s: RootState) => s.chartsTemplates.loading
export const selectChartReqTemplatesErrors  = (s: RootState) => s.chartsTemplates.errors
export const selectChartReqTemplatesLoaded  = (s: RootState) => s.chartsTemplates.listLoaded
