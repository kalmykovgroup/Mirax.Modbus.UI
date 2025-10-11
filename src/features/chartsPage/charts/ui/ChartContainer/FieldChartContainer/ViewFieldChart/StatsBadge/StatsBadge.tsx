// StatsBadge.tsx
import { useAppDispatch } from "@/store/hooks.ts";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store.ts";
import {
    selectFieldCurrentBucketMs
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import {
    selectVisiblePointsCount
} from "@chartsPage/charts/core/store/selectors/visualization.selectors.ts";
import { selectTimeSettings, setTimeSettings } from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import TimeZonePicker from "@chartsPage/charts/ui/TimeZonePicker/TimeZonePicker.tsx";
import styles from "./StatsBadge.module.css";
import classNames from "classnames";
import type {Guid} from "@app/lib/types/Guid.ts";

interface StatsBadgeProps {
    readonly contextId: Guid;
    readonly totalPoints: number;
    readonly coverage: number;
    readonly quality: string;
    readonly isLoading: boolean;
    readonly fieldName: string;
}

export function StatsBadge({
                               contextId,
                               totalPoints,
                               coverage,
                               quality,
                               isLoading,
                               fieldName
                           }: StatsBadgeProps) {
    const dispatch = useAppDispatch();
    const timeSettings = useSelector((state: RootState) => selectTimeSettings(state));
    const currentBucketMs = useSelector((state: RootState) =>
        selectFieldCurrentBucketMs(state, contextId, fieldName)
    );


    //  ИСПРАВЛЕНО: получаем реальное количество видимых точек из селектора
    const visiblePoints = useSelector((state: RootState) =>
        selectVisiblePointsCount(state, contextId, fieldName)
    );

    const coverageColor = coverage >= 95 ? 'green' : coverage >= 80 ? 'orange' : 'red';

    return (
        <div className={styles.statsBadge}>
            <TimeZonePicker
                value={timeSettings}
                onChange={(s) => dispatch(setTimeSettings(s))}
                label=""
            />

            {currentBucketMs !== undefined && (
                <span className={styles.stat}>
                    <span className={styles.statLabel}>Bucket:</span>
                    <strong>{formatBucketMs(currentBucketMs)}</strong>
                </span>
            )}

            {/*  Видимые / всего */}
            <span className={styles.stat}>
                <span className={classNames(styles.statLabel)}>Точек:</span>
                <strong>
                    {`${visiblePoints} / ${totalPoints}`}
                </strong>
            </span>

            <span className={styles.stat}>
                <span className={styles.statLabel}>Покрытие:</span>
                <strong style={{ color: coverageColor }}>
                    {coverage.toFixed(0)}%
                </strong>
            </span>

            <span className={styles.stat}>
                <span className={styles.statLabel}>Качество:</span>
                <span className={styles.qualityBadge} data-quality={quality}>
                    {getQualityLabel(quality)}
                </span>
            </span>

            {isLoading && (
                <span className={styles.loading} title="Загрузка данных...">
                    ⏳
                </span>
            )}
        </div>
    );
}

function formatBucketMs(ms: number): string {
    const seconds = ms / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days >= 1) return `${days.toFixed(0)}d`;
    if (hours >= 1) return `${hours.toFixed(0)}h`;
    if (minutes >= 1) return `${minutes.toFixed(0)}m`;
    return `${seconds.toFixed(0)}s`;
}

function getQualityLabel(quality: string): string {
    switch (quality) {
        case 'exact': return 'Точные';
        case 'upsampled': return 'Upsampled';
        case 'downsampled': return 'Downsampled';
        case 'none': return 'Нет данных';
        default: return quality;
    }
}