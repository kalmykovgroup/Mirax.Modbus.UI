// src/components/ChartCollection/ChartItem/dataAdapters.ts
import type { RawPointDto } from '@charts/shared/contracts/chart/Dtos/RawPointDto.ts';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts';

export function toTimeMs(t: Date | string | number): number {
    if (t instanceof Date) return t.getTime();
    if (typeof t === 'string') return Date.parse(t);
    return Number(t);
}

export type RawPointForChart = { value: [number, number | null]; raw: RawPointDto };
export type BinPointForChart = { value: [number, number | null]; bin: SeriesBinDto };

export function decimatePoints<T extends { value: [number, number | null] }>(
    arr: readonly T[],
    maxPoints: number
): [number, number | null][] {
    const n = arr.length;

    // границы и мусор
    if (n === 0 || !Number.isFinite(maxPoints) || maxPoints <= 0) return [];
    if (n <= maxPoints) return arr.map(p => p.value);

    const out: [number, number | null][] = [];
    const step = (n - 1) / (maxPoints - 1);

    for (let i = 0; i < maxPoints; i++) {
        // из-за плавающей точки idx может на единицу «перепрыгнуть» — страхуемся
        let idx = Math.round(i * step);
        if (idx < 0) idx = 0;
        if (idx >= n) idx = n - 1;

        const p = arr[idx]!;
        out[i] = p.value;
    }

    return out;
}



export function prepareRawSeriesData(raw: RawPointDto[]): RawPointForChart[] {
    return (raw ?? []).map(p => ({
        value: [toTimeMs(p.time as any), p.value ?? null],
        raw: p,
    }));
}

export function prepareBinnedSeriesData(bins: SeriesBinDto[]) {
    const safe = bins ?? [];

    const avg: BinPointForChart[] = safe.map(b => ({
        value: [toTimeMs(b.t as any), b.avg ?? b.min ?? b.max ?? null],
        bin: b,
    }));
    const minLine: BinPointForChart[] = safe.map(b => ({
        value: [toTimeMs(b.t as any), b.min ?? b.avg ?? b.max ?? null],
        bin: b,
    }));
    const maxLine: BinPointForChart[] = safe.map(b => ({
        value: [toTimeMs(b.t as any), b.max ?? b.avg ?? b.min ?? null],
        bin: b,
    }));

    // отдельные объекты для полосы
    const bandMin: BinPointForChart[] = safe.map(b => ({
        value: [toTimeMs(b.t as any), b.min ?? b.avg ?? b.max ?? null],
        bin: b,
    }));
    const bandDelta: BinPointForChart[] = safe.map(b => {
        const min = b.min ?? b.avg ?? b.max ?? null;
        const max = b.max ?? b.avg ?? b.min ?? null;
        const delta = min != null && max != null ? max - min : 0;
        return { value: [toTimeMs(b.t as any), delta], bin: b };
    });

    const countBar: BinPointForChart[] = safe.map(b => ({
        value: [toTimeMs(b.t as any), b.count ?? 0],
        bin: b,
    }));

    return { avg, minLine, maxLine, bandMin, bandDelta, countBar };
}
