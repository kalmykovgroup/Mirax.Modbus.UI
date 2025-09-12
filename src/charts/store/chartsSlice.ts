// src/store/slices/chartsSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store/types'
import {chartsApi} from "@/charts/shared/api/chartsApi.ts";
import type {SeriesBinDto} from "@/charts/shared/contracts/chart/Dtos/SeriesBinDto.ts";
import type {RawPointDto} from "@/charts/shared/contracts/chart/Dtos/RawPointDto.ts";
import type {MultiSeriesItemDto} from "@/charts/shared/contracts/chart/Dtos/MultiSeriesItemDto.ts";

// ----------------------------------------------------------------------------
// Типы и минимальные утилиты
// ----------------------------------------------------------------------------
export type TimeRange = { from: string; to: string } // ISO UTC
type Filters = Record<string, unknown> | undefined

const clampPx = (px: number | undefined, fallback = 1200) =>
    Math.max(300, Math.min(4000, Math.floor(px ?? fallback)))

// ----------------------------------------------------------------------------
// Состояние (минимум, но готово для расширения кэшем позже)
// ----------------------------------------------------------------------------


// 1) Тип состояния (добавь view)
export type ChartState = {

    // последние полученные бины по каждому полю
    bins: Record<string, SeriesBinDto[]>

    // последние полученные RAW-точки по каждому полю
    raw: Record<string, RawPointDto[]>

    // последний ответ multi; параллельно series раскладываем в bins[field]
    multiLast: { fields: string[]; bucketSeconds: number; series: MultiSeriesItemDto[] } | null

    view: Record<string, {
        px: number;
        range: TimeRange;
        visible: boolean;
        loading: boolean;
        error?: string | undefined
    }>
}

const initialState: ChartState = {
    bins: {},
    raw: {},
    multiLast: null,
    view: {},   // ← добавили
}


// ----------------------------------------------------------------------------
// Thunks (минимальные, без extraReducers — всё делаем внутри thunk)
// ----------------------------------------------------------------------------

// 1) /charts/series — одно поле (binned)
export const fetchSeriesSimple = createAsyncThunk<
    void,
    { entity: string; field: string; timeField: string; range: TimeRange; px: number; filters?: Filters }
>(
    'charts/fetchSeriesSimple',
    async (args, { dispatch }) => {
        const { entity, field, timeField, range, px, filters } = args

        dispatch(setFieldLoading({ field, loading: true }))

        const sub = dispatch(
            chartsApi.endpoints.getSeries.initiate({
                entity,
                field,
                timeField,
                from: range.from,
                to: range.to,
                px: clampPx(px),
                filters: (filters as any) ?? {},
            })
        )

        try {
            const data: any = await sub.unwrap()
            const bins: SeriesBinDto[] = data?.bins ?? []
            dispatch(setFieldBins({ field, bins }))
            dispatch(setFieldError({ field, error: undefined }))
        } catch (e: any) {
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed'
            dispatch(setFieldError({ field, error: msg }))
        } finally {
            dispatch(setFieldLoading({ field, loading: false }))
            sub.unsubscribe()
        }
    }
)

// 2) /charts/multi — несколько полей (binned)
export const fetchMultiSeriesSimple = createAsyncThunk<
    void,
    { entity: string; fields: string[]; timeField: string; range: TimeRange; px: number; filters?: Filters }
>(
    'charts/fetchMultiSeriesSimple',
    async (args, { dispatch }) => {
        const { entity, fields, timeField, range, px, filters } = args
        const uniqueFields = Array.from(new Set(fields))

        for (const f of uniqueFields) dispatch(setFieldLoading({ field: f, loading: true }))

        const sub = dispatch(
            chartsApi.endpoints.getMultiSeries.initiate({
                entity,
                fields: uniqueFields,
                timeField,
                from: range.from,
                to: range.to,
                px: clampPx(px),
                filters: (filters as any) ?? {},
            })
        )

        try {
            const data: any = await sub.unwrap()
            const bucketSeconds: number = data?.bucketSeconds ?? 0
            const series: MultiSeriesItemDto[] = data?.series ?? []

            dispatch(setMultiResult({ fields: uniqueFields, bucketSeconds, series }))

            // Перезаписываем per-field бины, чтобы UI мог просто читать selectBins(field)
            for (const item of series) {
                dispatch(setFieldBins({ field: item.field, bins: item.bins ?? [] }))
                dispatch(setFieldError({ field: item.field, error: undefined }))
            }
        } catch (e: any) {
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed'
            for (const f of uniqueFields) dispatch(setFieldError({ field: f, error: msg }))
        } finally {
            for (const f of uniqueFields) dispatch(setFieldLoading({ field: f, loading: false }))
            sub.unsubscribe()
        }
    }
)

// 3) /charts/raw — сырые точки одного поля
export const fetchRawSimple = createAsyncThunk<
    void,
    { entity: string; field: string; timeField: string; range: TimeRange; filters?: Filters; maxPoints?: number }
>(
    'charts/fetchRawSimple',
    async (args, { dispatch }) => {
        const { entity, field, timeField, range, filters, maxPoints } = args

        dispatch(setFieldLoading({ field, loading: true }))

        const sub = dispatch(
            chartsApi.endpoints.getRaw.initiate({
                entity,
                field,
                timeField,
                from: range.from,
                to: range.to,
                filters: (filters as any) ?? {},
                maxPoints,
            })
        )

        try {
            const data: any = await sub.unwrap()
            const points: RawPointDto[] = data?.points ?? []
            dispatch(setFieldRaw({ field, points }))
            dispatch(setFieldError({ field, error: undefined }))
        } catch (e: any) {
            const msg =
                e?.data?.errorMessage ??
                (typeof e?.data === 'string' ? e.data : undefined) ??
                e?.message ??
                'Request failed'
            dispatch(setFieldError({ field, error: msg }))
        } finally {
            dispatch(setFieldLoading({ field, loading: false }))
            sub.unsubscribe()
        }
    }
)

// ----------------------------------------------------------------------------
// Slice (только обычные reducers; extraReducers не используем)
// ----------------------------------------------------------------------------
const chartsSlice = createSlice({
    name: 'charts',
    initialState,
    reducers: {
        ensureFieldView(state, action: PayloadAction<{ field: string; px: number; range: TimeRange; visible?: boolean }>) {
            const { field, px, range, visible = true } = action.payload
            state.view[field] ??= { px, range, visible, loading: false }
            // обновляем px/range если изменились
            state.view[field].px = px
            state.view[field].range = range
            state.view[field].visible = visible
        },
        setFieldPx(state, action: PayloadAction<{ field: string; px: number }>) {
            if (state.view[action.payload.field])
            {
                state.view[action.payload.field]!.px = action.payload.px
            }
        },
        setFieldRange(state, action: PayloadAction<{ field: string; range: TimeRange }>) {
            if (state.view[action.payload.field]) {
                state.view[action.payload.field]!.range = action.payload.range
            }
        },
        toggleField(state, action: PayloadAction<string>) {
            const v = state.view[action.payload]
            if (v) v.visible = !v.visible
        },

        setFieldBins(state, action: PayloadAction<{ field: string; bins: SeriesBinDto[] }>) {
            const { field, bins } = action.payload
            state.bins[field] = bins
        },
        setFieldRaw(state, action: PayloadAction<{ field: string; points: RawPointDto[] }>) {
            const { field, points } = action.payload
            state.raw[field] = points
        },
        setMultiResult(
            state,
            action: PayloadAction<{ fields: string[]; bucketSeconds: number; series: MultiSeriesItemDto[] }>
        ) {
            state.multiLast = {
                fields: action.payload.fields,
                bucketSeconds: action.payload.bucketSeconds,
                series: action.payload.series,
            }
        },
        setFieldLoading(state, action: PayloadAction<{ field: string; loading: boolean }>) {
            const { field, loading } = action.payload
            state.view[field] ??= { px: 1200, range: { from: '', to: '' }, visible: true, loading: false }
            state.view[field].loading = loading
            if (loading) state.view[field].error = undefined
        },
        setFieldError(state, action: PayloadAction<{ field: string; error?: string | undefined }>) {
            const { field, error } = action.payload
            state.view[field] ??= { px: 1200, range: { from: '', to: '' }, visible: true, loading: false }
            state.view[field].error = error
        },
        clearField(state, action: PayloadAction<string>) {
            const f = action.payload
            delete state.bins[f]
            delete state.raw[f]
            delete state.view[f]
        },
        clearAll(state) {
            state.bins = {}
            state.raw = {}
            state.view = {}
            state.multiLast = null
        },
    },
})

export const {
    ensureFieldView,
    setFieldPx,
    setFieldRange,
    toggleField,
    setFieldBins,
    setFieldRaw,
    setMultiResult,
    setFieldLoading,
    setFieldError,
    clearField,
    clearAll,
} = chartsSlice.actions

export default chartsSlice.reducer

// ----------------------------------------------------------------------------
// Простейшие селекторы
// ----------------------------------------------------------------------------
export const selectBins = (field: string) => (s: RootState) => s.charts.bins[field] ?? []
export const selectRawPoints = (field: string) => (s: RootState) => s.charts.raw[field] ?? []
export const selectFieldUi = (field: string) => (s: RootState) => s.charts.view[field] ?? { loading: false }
export const selectMultiLast = (s: RootState) => s.charts.multiLast
export const selectFieldView = (field: string) => (s: RootState) => s.charts.view[field]