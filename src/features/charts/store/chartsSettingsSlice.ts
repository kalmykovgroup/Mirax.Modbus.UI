// src/store/chartsSettingsSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ChartBucketingConfig = {
    /** Сколько "целей" (ведер/поинтов) на пиксель хотим видеть */
    targetPointsPerPx: number
    /** Минимум целевых ведер (защита от слишком малых объемов) */
    minTargetPoints: number
    /** Размножать 1w на 2w..Nw */
    enableWeeklyMultiples: boolean
    /** Максимальный множитель недель (если EnableWeeklyMultiples=true) */
    maxWeeksMultiple: number
    /** Красивые длительности в секундах: 1,2,5,10,15,20,30,60,... */
    niceMilliseconds: number[]
}

const MIN_TARGET_POINTS = 20;
const TARGET_POINTS_PER_PX = 0.1;
const NICE_BUCKETS_MS = [
    1000,        // 1 секунда
    2000,        // 2 секунды
    5000,        // 5 секунд
    10000,       // 10 секунд
    15000,       // 15 секунд
    20000,       // 20 секунд
    30000,       // 30 секунд
    60000,       // 1 минута
    120000,      // 2 минуты
    300000,      // 5 минут
    600000,      // 10 минут
    900000,      // 15 минут
    1800000,     // 30 минут
    3600000,     // 1 час
    7200000,     // 2 часа
    10800000,    // 3 часа
    21600000,    // 6 часов
    43200000,    // 12 часов
    86400000,    // 1 день
    172800000,   // 2 дня
    604800000,   // 7 дней (1 неделя)
    2592000000,  // 30 дней (~1 месяц)
    7776000000,  // 90 дней (~3 месяца)
    15552000000, // 180 дней (~6 месяцев)
    31536000000, // 365 дней (1 год)
    63072000000, // 2 года
    157680000000 // 5 лет
]
const MAX_WEEKS_MULTIPLE = 52;
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
        targetPointsPerPx: TARGET_POINTS_PER_PX,
        minTargetPoints: MIN_TARGET_POINTS,
        enableWeeklyMultiples: false,
        maxWeeksMultiple: MAX_WEEKS_MULTIPLE,
        niceMilliseconds: NICE_BUCKETS_MS,
    },
    timeSettings: {
        useTimeZone: true,  // Включено по умолчанию
        timeZone: 'UTC'     // UTC по умолчанию
    }
};

export function calculateBucket(
    from: Date,
    to: Date,
    widthPx: number,
    enableWeeklyMultiples: boolean = false,
    maxWeeksMultiple: number = MAX_WEEKS_MULTIPLE
): number {
    console.log("calculateBucket", from, to, widthPx, enableWeeklyMultiples, maxWeeksMultiple)


    // 1. Вычисляем span в миллисекундах
    const spanMs = Math.max(1, to.getTime() - from.getTime());

    // 2. Целевое количество точек
    const targetPoints = Math.max(
        MIN_TARGET_POINTS,
        Math.floor(widthPx * TARGET_POINTS_PER_PX)
    );

    // 3. Идеальный bucket (rough)
    const rough = Math.max(1, spanMs / targetPoints);

    for (const n of NICE_BUCKETS_MS) {
        if (n >= rough) {
            return n;  // Возвращаем ПЕРВЫЙ подходящий
        }
    }

    // 5. Если rough больше максимального nice
    if (enableWeeklyMultiples) {
        const WEEK_MS = 7 * 24 * 3600 * 1000;  // Неделя в мс
        let mult = Math.ceil(rough / WEEK_MS);
        mult = Math.max(1, Math.min(mult, maxWeeksMultiple));
        return Math.round(mult * WEEK_MS);
    }

    // 6. Иначе - последний из nice
    if (NICE_BUCKETS_MS.length > 0) {
        return NICE_BUCKETS_MS[NICE_BUCKETS_MS.length - 1]!;
    }

    // 7. Fallback на неделю
    return 604800000;  // 7 дней в миллисекундах
}
 
const chartsSettingsSlice = createSlice({
    name: 'chartsSettings',
    initialState,
    reducers: {
        // Новые экшены для временной зоны
        setTimeSettings(state, action: PayloadAction<TimeSettings>) {
            state.timeSettings = action.payload
        },
    },
})



export const {
    setTimeSettings,
} = chartsSettingsSlice.actions

export const chartsSettingsReducer = chartsSettingsSlice.reducer
