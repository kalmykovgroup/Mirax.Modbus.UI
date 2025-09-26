// src/store/chartsSettingsSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/store/store'

export type ChartBucketingConfig = {
    /** Сколько "целей" (ведер/поинтов) на пиксель хотим видеть */
    TargetPointsPerPx: number
    /** Минимум целевых ведер (защита от слишком малых объемов) */
    MinTargetPoints: number
    /** Размножать 1w на 2w..Nw */
    EnableWeeklyMultiples: boolean
    /** Максимальный множитель недель (если EnableWeeklyMultiples=true) */
    MaxWeeksMultiple: number
    /** Красивые длительности в секундах: 1,2,5,10,15,20,30,60,... */
    NiceSeconds: number[]
}

export type TimeSettings = {
    /** Использовать ли преобразование временной зоны */
    useTimeZone: boolean
    /** Выбранная временная зона (IANA timezone) */
    timeZone: string
}

export type ChartsSettingsState = {
    bucketing: ChartBucketingConfig
    timeSettings: TimeSettings
}

const initialState: ChartsSettingsState = {
    bucketing: {
        TargetPointsPerPx: 0.25,
        MinTargetPoints: 20,
        EnableWeeklyMultiples: false,
        MaxWeeksMultiple: 52,
        NiceSeconds: [
            1, 2, 5, 10, 15, 20, 30,
            60, 120, 300, 600, 900, 1800,
            3600, 7200, 10800, 21600, 43200,
            86400, 172800, 604800,
            2592000, 7776000, 15552000, 31536000, 63072000, 157680000
        ],
    },
    timeSettings: {
        useTimeZone: true,  // Включено по умолчанию
        timeZone: 'UTC'     // UTC по умолчанию
    }
}

const chartsSettingsSlice = createSlice({
    name: 'chartsSettings',
    initialState,
    reducers: {
        setBucketingConfig(state, action: PayloadAction<Partial<ChartBucketingConfig>>) {
            state.bucketing = { ...state.bucketing, ...action.payload }
        },
        setNiceSeconds(state, action: PayloadAction<number[]>) {
            state.bucketing.NiceSeconds = action.payload ?? []
        },
        setEnableWeeklyMultiples(state, action: PayloadAction<{ enabled: boolean; maxWeeks?: number | undefined }>) {
            state.bucketing.EnableWeeklyMultiples = !!action.payload.enabled
            if (typeof action.payload.maxWeeks === 'number') {
                state.bucketing.MaxWeeksMultiple = Math.max(1, Math.floor(action.payload.maxWeeks))
            }
        },
        // Новые экшены для временной зоны
        setTimeSettings(state, action: PayloadAction<TimeSettings>) {
            state.timeSettings = action.payload
        },
        setUseTimeZone(state, action: PayloadAction<boolean>) {
            state.timeSettings.useTimeZone = action.payload
        },
        setTimeZone(state, action: PayloadAction<string>) {
            state.timeSettings.timeZone = action.payload
        },
        resetTimeSettingsToDefaults(state) {
            state.timeSettings = initialState.timeSettings
        },
        resetBucketingToDefaults() {
            return initialState
        },
    },
})

export const {
    setBucketingConfig,
    setNiceSeconds,
    setEnableWeeklyMultiples,
    setTimeSettings,
    setUseTimeZone,
    setTimeZone,
    resetTimeSettingsToDefaults,
    resetBucketingToDefaults,
} = chartsSettingsSlice.actions

export const chartsSettingsReducer = chartsSettingsSlice.reducer

// ---------- селекторы ----------
export const selectBucketingConfig = (s: RootState) => s.chartsSettings.bucketing
export const selectTimeSettings = (s: RootState) => s.chartsSettings.timeSettings
export const selectTimeZone = (s: RootState) => s.chartsSettings.timeSettings.timeZone
export const selectUseTimeZone = (s: RootState) => s.chartsSettings.timeSettings.useTimeZone

/** NiceSeconds → миллисекунды; с учётом EnableWeeklyMultiples */
export const selectNiceBucketsMs = (s: RootState): number[] => {
    const cfg = s.chartsSettings.bucketing
    const base = (cfg.NiceSeconds ?? []).map(s => Math.max(1, Math.floor(s)) * 1000)

    if (cfg.EnableWeeklyMultiples) {
        const weekSec = 7 * 24 * 3600
        const add: number[] = []
        for (let k = 1; k <= Math.max(1, cfg.MaxWeeksMultiple); k++) {
            add.push(weekSec * k * 1000)
        }
        // дедуп + сортировка
        const set = new Set([...base, ...add])
        return [...set].sort((a, b) => a - b)
    }

    return [...base].sort((a, b) => a - b)
}