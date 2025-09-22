// src/components/ChartHeader/ChartHeader.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto.ts';
import {
    selectBins,
    selectFieldView,
    selectMultiLast,
    selectRawPoints,
} from '@charts/store/chartsSlice.ts';
import styles from './ChartHeader.module.css';
import {fmtMaxFrac} from "@app/lib/utils/parcent.ts";
import {useTheme} from "@app/providers/theme/useTheme.ts";

type Props = { field: FieldDto };

// --- helpers ---
const sumCounts = (bins: Array<{ count?: number | null }>) =>
    bins.reduce((acc, b) => acc + (b.count ?? 0), 0);

const rangeKey = (from?: Date, to?: Date) =>
    (from?.toISOString() ?? 'na') + '|' + (to?.toISOString() ?? 'na');


// --- component ---
const ChartHeader: React.FC<Props> = ({ field }) => {

    const {theme} = useTheme();

    const name = field.name;

    const bins = useSelector(useMemo(() => selectBins(name), [name]));
    const raw = useSelector(useMemo(() => selectRawPoints(name), [name]));
    const view = useSelector(useMemo(() => selectFieldView(name), [name]));
    const multi = useSelector(selectMultiLast);

    const binsCount = bins.length;
    const sumCountNow = sumCounts(bins);
    const hasRaw = (raw?.length ?? 0) > 0;

    // Стабилизация целевого Σcount на диапазон
    const rkNow = rangeKey(view?.range?.from, view?.range?.to);
    const lastKeyRef = useRef<string>('');
    const targetRef = useRef<number>(0);

    useEffect(() => {
        if (rkNow !== lastKeyRef.current) {
            lastKeyRef.current = rkNow;
            targetRef.current = 0;
        }
        if (sumCountNow > targetRef.current) {
            targetRef.current = sumCountNow;
        }
    }, [rkNow, sumCountNow]);

    const targetBuckets = targetRef.current;

    // Прогресс: current / target  (RAW => 100%)
    const progress = hasRaw
        ? 1
        : targetBuckets > 0
            ? Math.max(0, Math.min(1, binsCount / targetBuckets))
            : 0;

    // >>> вот тут теперь ЧИСЛО
    const percentNum = progress * 100;
    const percentClamped = Math.max(0, Math.min(100, percentNum));

    const avgPerBucket = binsCount > 0 ? sumCountNow / binsCount : 0;
    const bucketSeconds = multi?.bucketSeconds;
    const range = view?.range;

    return (
        <div className={styles.header} data-theme={theme}>
            <div className={styles.rowTop}>
                <div className={styles.title} title={name}>{name}</div>

                <div className={styles.meta} data-theme={theme}>
                  <span className={styles.kv}>
                    <span className={styles.k}>Вёдер:</span>
                    <span className={styles.v}>{binsCount.toLocaleString('ru-RU')}</span>
                  </span>
                            <span className={styles.sep}>•</span>
                            <span className={styles.kv}>
                    <span className={styles.k}>Цель (Σcount):</span>
                    <span className={styles.v}>{targetBuckets.toLocaleString('ru-RU')}</span>
                  </span>
                            <span className={styles.sep}>•</span>
                            <span className={styles.kv}>
                    <span className={styles.k}>Сред./ведро:</span>
                    <span className={styles.v}>{fmtMaxFrac(avgPerBucket, 1)}</span>
                  </span>
                            {typeof bucketSeconds === 'number' && bucketSeconds > 0 && (
                                <>
                                    <span className={styles.sep}>•</span>
                                    <span className={styles.kv}>
                        <span className={styles.k}>Квант:</span>
                        <span className={styles.v}>{bucketSeconds}s</span>
                      </span>
                                </>
                            )}
                            {hasRaw && (
                                <>
                                    <span className={styles.sep}>•</span>
                                    <span className={styles.badgeRaw}>RAW</span>
                                </>
                            )}
                </div>
            </div>

            <div className={styles.progressBar} aria-label="Detail progress">
                <div
                    className={styles.progressFill}
                    style={{ width: `${percentClamped}%` }}
                    aria-valuenow={percentClamped}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={`${fmtMaxFrac(percentNum, 22)}%`}
                    title={`${binsCount.toLocaleString('ru-RU')} / ${targetBuckets.toLocaleString('ru-RU')}`}
                />

            </div>

            <div className={styles.rowBottom}>
        <span className={styles.progressText}>
          Детализация: <b>{fmtMaxFrac(percentNum, 2)}%</b>{' '}
            <span className={styles.small}>
            ({binsCount.toLocaleString('ru-RU')} / {targetBuckets.toLocaleString('ru-RU')})
          </span>
        </span>
                {range?.from && range?.to && (
                    <span className={styles.range}>
            Диапазон: {range.from.toISOString()} — {range.to.toISOString()}
          </span>
                )}
            </div>
        </div>
    );
};

export default ChartHeader;
