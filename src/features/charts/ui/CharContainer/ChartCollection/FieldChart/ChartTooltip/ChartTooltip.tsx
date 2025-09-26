// charts/ui/CharContainer/ChartCollection/FieldChart/ChartTooltip.tsx
import React from 'react';
import styles from './ChartTooltip.module.css';
import type {SeriesBinDto} from "@charts/shared/contracts/chart/Dtos/SeriesBinDto.ts";

export type ChartTooltipProps = {
    fieldName: string;
    title: string;               // форматированная дата/время
    bin: SeriesBinDto
    bucketSize?: string | undefined ;
};

const ChartTooltip: React.FC<ChartTooltipProps> = ({
                                                       fieldName,
                                                       title,
                                                       bin,
                                                       bucketSize,
                                                   }) => {
    const formatValue = (val: number | null | undefined): string => {
        if (val === null || val === undefined) return '—';
        if (!Number.isFinite(val)) return '—';
        return val.toFixed(2);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.title}>
                {fieldName}
            </div>

            <div className={styles.title} style={{ fontSize: '12px', fontWeight: 400 }}>
                {title}
            </div>

            {bin.avg !== undefined && (
                <div className={`${styles.row} ${styles.avg}`}>
                    <span className={`${styles.bullet} ${styles.bAvg}`} />
                    Среднее: <b>{formatValue(bin.avg)}</b>
                </div>
            )}

            {bin.min !== undefined && (
                <div className={`${styles.row} ${styles.min}`}>
                    <span className={`${styles.bullet} ${styles.bMin}`} />
                    Минимум: <b>{formatValue(bin.min)}</b>
                </div>
            )}

            {bin.max !== undefined && (
                <div className={`${styles.row} ${styles.max}`}>
                    <span className={`${styles.bullet} ${styles.bMax}`} />
                    Максимум: <b>{formatValue(bin.max)}</b>
                </div>
            )}

            {bin.count !== undefined && (
                <div className={styles.count}>
                    <span>Точек:</span>
                    <span>{bin.count}</span>
                </div>
            )}

            {bucketSize && (
                <div className={styles.count}>
                    <span>Интервал:</span>
                    <span>{bucketSize}</span>
                </div>
            )}
        </div>
    );
};

export default ChartTooltip;