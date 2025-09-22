import React from 'react';
import styles from './ChartTooltip.module.css';

export type ChartTooltipProps = {
    title: string;               // форматированная дата/время
    isRaw?: boolean;
    value?: string;              // для raw
    count?: string | number;
    avg?: string;
    min?: string;
    max?: string;
};

const ChartTooltip: React.FC<ChartTooltipProps> = ({ title, isRaw, value, count, avg, min, max }) => {
    return (
        <div className={styles.wrapper}>
            <div className={styles.title}>{title}</div>

            {isRaw ? (
                <div className={`${styles.row} ${styles.avg}`}>
                    <span className={`${styles.bullet} ${styles.bAvg}`} />
                    value: <b>{value ?? '—'}</b>
                </div>
            ) : (
                <>

                    <div className={`${styles.row} ${styles.max}`}>
                        <span className={`${styles.bullet} ${styles.bMax}`} />
                        max: <b>{max ?? '—'}</b>
                    </div>

                    <div className={`${styles.row} ${styles.avg}`}>
                        <span className={`${styles.bullet} ${styles.bAvg}`} />
                        avg: <b>{avg ?? '—'}</b>
                    </div>
                    <div className={`${styles.row} ${styles.min}`}>
                        <span className={`${styles.bullet} ${styles.bMin}`} />
                        min: <b>{min ?? '—'}</b>
                    </div>

                    <div className={`${styles.count}`}>
                        <span>Кол-во элементов:</span><span>{count ?? '—'}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChartTooltip;
