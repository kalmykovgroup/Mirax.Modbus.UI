/*
// src/components/ChartHeader/ChartHeader.tsx
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto.ts';

import styles from './ChartHeader.module.css';
import { fmtMaxFrac } from '@app/lib/utils/parcent.ts';
import { useTheme } from '@app/providers/theme/useTheme.ts';
import { formatMsForUI, type TimeSettings } from '@charts/ui/CharContainer/ChartCollection/ChartItem/lib/dataAdapters.ts';
import { selectBins, selectFieldUi, selectFieldView, selectLevelProgress } from '@charts/store/selectors.ts';
import { BUCKETS_MS } from '@charts/store/chartsSlice.ts';

// ---------- helpers ----------
const sumCounts = (bins: Array<{ count?: number | null }>) =>
    bins.reduce((acc, b) => acc + (b.count ?? 0), 0);

type Props = { field: FieldDto; timeSettings: TimeSettings };

const ChartHeader: React.FC<Props> = ({ field, timeSettings }) => {
    const { theme } = useTheme();
    const name = field.name;

    const bins = useSelector(useMemo(() => selectBins(name), [name]));
    const view = useSelector(useMemo(() => selectFieldView(name), [name]));
    const ui   = useSelector(useMemo(() => selectFieldUi(name), [name]));
    const progressMap = useSelector(useMemo(() => selectLevelProgress(name), [name]));

    const binsCount = bins.length;
    const sumCountNow = sumCounts(bins);

    const range = view?.range;

    const rangeFromText = range?.from ? formatMsForUI(range.from.getTime(), timeSettings) : null;
    const rangeToText   = range?.to   ? formatMsForUI(range.to.getTime(),   timeSettings) : null;


    const overallPercent = useMemo(() => {
        // берём все уровни, а не фильтруем target>0
        const levelsArr = BUCKETS_MS.map((_, lvl) => progressMap?.[lvl] ?? { loaded: 0, target: 0 });
        const sumTarget = levelsArr.reduce((a, x) => a + Math.max(0, x.target ?? 0), 0);
        const sumLoaded = levelsArr.reduce((a, x) => a + Math.max(0, x.loaded ?? 0), 0);
        if (sumTarget <= 0) return 0;
        return Math.max(0, Math.min(100, (sumLoaded / sumTarget) * 100));
    }, [progressMap]);

    const avgPerBucket = binsCount > 0 ? (sumCountNow / binsCount) : 0;

    return (
        <div className={styles.header} data-theme={theme}>
            <div className={styles.rowTop}>
                <div className={styles.title} title={name}>{name}</div>

                <div className={styles.meta} data-theme={theme}>
          <span className={styles.kv}>
            <span className={styles.k}>Уровень (UI):</span>
            <span className={styles.v}>
              {ui.level}<span className={styles.small}>&nbsp;(tick {ui.ticksInLevel}/10)</span>
            </span>
          </span>
                    <span className={styles.sep}>•</span>
                    <span className={styles.kv}>
            <span className={styles.k}>Вёдер (текущий ответ):</span>
            <span className={styles.v}>{binsCount.toLocaleString('ru-RU')}</span>
          </span>
                    <span className={styles.sep}>•</span>
                    <span className={styles.kv}>
            <span className={styles.k}>Сред./ведро:</span>
            <span className={styles.v}>{fmtMaxFrac(avgPerBucket, 1)}</span>
          </span>
                    {ui.loading && (
                        <>
                            <span className={styles.sep}>•</span>
                            <span className={styles.badgeLoading}>loading…</span>
                        </>
                    )}
                    {ui.error && (
                        <>
                            <span className={styles.sep}>•</span>
                            <span className={styles.badgeError} title={ui.error}>error</span>
                        </>
                    )}
                </div>
            </div>

            {/!* ОБЩАЯ шкала (по домену и coverage в сторе) *!/}
            <div className={styles.progressBar} aria-label="Overall progress">
                <div
                    className={styles.progressFill}
                    style={{ width: `${overallPercent}%` }}
                    aria-valuenow={overallPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={`${overallPercent.toFixed(1)}%`}
                    title={`Σ уровней: ${(overallPercent).toFixed(1)}% (loaded/target по всем уровням)`}
                />
            </div>



            <div className={styles.rowBottom}>
                {rangeFromText && rangeToText && (
                    <span className={styles.range}>
            Диапазон: {rangeFromText} — {rangeToText}
          </span>
                )}
            </div>
        </div>
    );
};

export default ChartHeader;
*/
