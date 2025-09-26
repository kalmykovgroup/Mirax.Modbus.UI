// src/store/bucketing.ts
import type {BucketsMs} from './chartsSlice';

export type BucketingConfig = {
    TargetPointsPerPx: number;
    MinTargetPoints: number;
    EnableWeeklyMultiples: boolean;
    MaxWeeksMultiple: number;
    NiceSeconds: number[];
};

export function pickBucketMsFor(px: number, from: Date, to: Date, cfg: BucketingConfig): BucketsMs {
    const spanSec = Math.max(1, Math.round((to.getTime() - from.getTime()) / 1000));
    const target = Math.max(cfg.MinTargetPoints, Math.round(px * cfg.TargetPointsPerPx));
    const roughSec = Math.max(1, Math.floor(spanSec / Math.max(1, target)));

    // первый "красивый" ≥ rough
    const nice = [...cfg.NiceSeconds].sort((a,b)=>a-b);
    const n = nice.find(s => s >= roughSec);
    if (n) return n * 1000;

    // если rough больше максимума:
    if (cfg.EnableWeeklyMultiples) {
        const week = 7*24*3600;
        const mult = Math.min(cfg.MaxWeeksMultiple, Math.max(1, Math.ceil(roughSec / week)));
        return mult * week * 1000;
    }
    // иначе — максимум из списка
    return nice.length ? nice[nice.length - 1]! * 1000 : 604800000; // 1w
}

/** Сколько бинов получится на окне при данном bucketMs */
export function binsOnWindow(bucketMs: BucketsMs, from: Date, to: Date): number {
    const span = Math.max(1, to.getTime() - from.getTime());
    return Math.ceil(span / Math.max(1, bucketMs));
}


// src/store/bucketing.ts (добавьте)
export function shouldSwitchBucket(
    currentBucketMs: BucketsMs,
    px: number,
    from: Date,
    to: Date,
    cfg: BucketingConfig,
    lower=0.7, upper=1.3
): boolean {
    const target = Math.max(cfg.MinTargetPoints, Math.round(px * cfg.TargetPointsPerPx));
    const curBins = binsOnWindow(currentBucketMs, from, to);
    return (curBins < lower * target) || (curBins > upper * target);
}
