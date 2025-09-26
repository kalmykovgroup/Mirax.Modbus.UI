// src/components/ChartCollection/ChartItem/dataAdapters.ts
import type { RawPointDto } from '@charts/shared/contracts/chart/Dtos/RawPointDto.ts';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts';

/** Настройки времени, которыми управляет UI */
export type TimeSettings = {
    /** true -> показываем время в выбранной зоне; false -> показываем исходное "как есть" (UTC без индикатора зоны) */
    useTimeZone: boolean;
    /** IANA зона, например 'Europe/Helsinki' */
    timeZone: string;
    /** Локаль для форматирования */
    locale: string;
};

/**
 * Конвертация произвольного значения времени в миллисекунды.
 * Правила:
 *  - number: уже мс
 *  - Date:   абсолютное время (getTime)
 *  - string: если есть 'Z' или смещение (+/-hh:mm) — используем как есть;
 *            если смещения нет — трактуем как UTC (добавляем 'Z')
 */
export function toMs(t: string | number | Date | null | undefined): number {
    if (t == null) return NaN;
    if (typeof t === 'number') return t;
    if (t instanceof Date) return t.getTime();

    const s = String(t).trim();
    const hasZone = /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
    const iso = hasZone ? s : `${s}Z`;
    const d = new Date(iso);
    return d.getTime();
}

/** Форматирование для UI: либо «в выбранной зоне», либо как исходное UTC-время без индикатора зоны */
export function formatMsForUI(ms: number, s: TimeSettings): string {
    if (!s.useTimeZone) {
        // Показываем исходное UTC-время без 'Z' (наглядно "как в источнике")
        return new Date(ms).toISOString().slice(0, 19);
    }
    return new Intl.DateTimeFormat(s.locale, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
        timeZone: s.timeZone,
    }).format(ms);
}

/** Для сервера: однозначный UTC ISO */
export function msToIsoUtc(ms: number): string {
    return new Date(ms).toISOString();
}

/** Типы подготовленных точек */
export type RawPointForChart = { value: [timeMs: number, y: number | null]; raw: RawPointDto };
export type BinPointForChart  = { value: [timeMs: number, y: number | null]; bin: SeriesBinDto };

/** Равномерная прореживалка (используется в seriesBuilders.ts) */
export function decimatePoints<T extends { value: [number, number | null] }>(
    arr: readonly T[],
    maxPoints: number
): [number, number | null][] {
    const n = arr.length;
    if (n === 0 || !Number.isFinite(maxPoints) || maxPoints <= 0) return [];
    if (n <= maxPoints) return arr.map(p => p.value);

    const out: [number, number | null][] = new Array(maxPoints);
    const step = (n - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints; i++) {
        let idx = Math.round(i * step);
        if (idx < 0) idx = 0;
        if (idx >= n) idx = n - 1;
        out[i] = arr[idx]!.value;
    }
    return out;
}

/** Подготовка сырых точек к графику */
export function prepareRawSeriesData(raw: RawPointDto[]): RawPointForChart[] {
    const src = Array.isArray(raw) ? raw : [];
    return src.map(p => ({
        value: [toMs(p.time as unknown as string | number | Date), p.value ?? null],
        raw: p,
    }));
}

/** Подготовка бинов к графику */
export function prepareBinnedSeriesData(bins: SeriesBinDto[]) {
    const safe = Array.isArray(bins) ? bins : [];

    const avg:     BinPointForChart[] = safe.map(b => ({ value: [toMs(b.t as any), b.avg   ?? b.min ?? b.max ?? null], bin: b }));
    const minLine: BinPointForChart[] = safe.map(b => ({ value: [toMs(b.t as any), b.min   ?? b.avg ?? b.max ?? null], bin: b }));
    const maxLine: BinPointForChart[] = safe.map(b => ({ value: [toMs(b.t as any), b.max   ?? b.avg ?? b.min ?? null], bin: b }));

    const bandMin:   BinPointForChart[] = safe.map(b => ({ value: [toMs(b.t as any), b.min ?? b.avg ?? b.max ?? null], bin: b }));
    const bandDelta: BinPointForChart[] = safe.map(b => {
        const min = b.min ?? b.avg ?? b.max ?? null;
        const max = b.max ?? b.avg ?? b.min ?? null;
        const delta = min != null && max != null ? max - min : 0;
        return { value: [toMs(b.t as any), delta], bin: b };
    });

    const countBar: BinPointForChart[] = safe.map(b => ({ value: [toMs(b.t as any), b.count ?? 0], bin: b }));

    return { avg, minLine, maxLine, bandMin, bandDelta, countBar };
}
