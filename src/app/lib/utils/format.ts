// src/shared/lib/number/format.ts

/**
 * Округляет число до N знаков после запятой ВНИЗ (floor) или ВВЕРХ (ceil).
 * Важно: для отрицательных значений "вниз" = в сторону -∞, "вверх" = в сторону +∞ (классическая семантика floor/ceil).
 */
export function roundWithMode(
    value: number,
    decimals = 2,
    roundUp = false
): number {
    if (!Number.isFinite(value)) return NaN;
    const d = Number.isInteger(decimals) && decimals >= 0 ? decimals : 0;

    const factor = 10 ** d;
    // Небольшая поправка на плавающую точку, чтобы 1.005 * 100 не ломал ceil/floor
    const eps = Number.EPSILON * (roundUp ? +1 : -1);
    const scaled = value * factor + eps;

    const roundedInt = roundUp ? Math.ceil(scaled) : Math.floor(scaled);
    return roundedInt / factor;
}

/**
 * Форматирует число строкой с округлением вверх/вниз и ограничением знаков.
 * По умолчанию локаль 'ru-RU'. Возвращает fallback для null/NaN/Infinity.
 */
export function formatWithMode(
    value: number | null | undefined,
    decimals = 2,
    roundUp = false,
    locale = 'ru-RU',
    fallback = '—'
): string {
    if (value == null || !Number.isFinite(value)) return fallback;
    const v = roundWithMode(value, decimals, roundUp);
    return v.toLocaleString(locale, { maximumFractionDigits: decimals });
}
