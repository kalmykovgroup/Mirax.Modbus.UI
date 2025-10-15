import styles from "./ChartFooter.module.css";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/baseStore/store.ts";
import {
    selectFieldCurrentRange,
    selectFieldOriginalRange
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import { formatDateWithTimezone } from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";
import { selectTimeSettings } from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type { TimeSettings } from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type {Guid} from "@app/lib/types/Guid.ts";

interface DateRangeProps {
    readonly fromMs: number;
    readonly toMs: number;
    readonly timeSettings: TimeSettings;
}

/**
 * Разделяет строку формата "DD.MM.YYYY, HH:MM:SS" на дату и время
 */
function splitDateTime(formatted: string): { date: string; time: string } {
    const match = formatted.match(/^(.+?),\s*(.+)$/);
    if (match) {
        return { date: match[1]!.trim(), time: match[2]!.trim() };
    }
    // Fallback: если формат другой
    return { date: formatted, time: '' };
}

/**
 * Компонент для красивого отображения диапазона дат/времени
 */
const DateRange: React.FC<DateRangeProps> = ({ fromMs, toMs, timeSettings }) => {
    const formatted = useMemo(() => {
        const fullFrom = formatDateWithTimezone(fromMs, timeSettings);
        const fullTo = formatDateWithTimezone(toMs, timeSettings);

        const from = splitDateTime(fullFrom);
        const to = splitDateTime(fullTo);

        const isSameDate = from.date === to.date;

        return { from, to, isSameDate };
    }, [fromMs, toMs, timeSettings]);

    if (formatted.isSameDate) {
        // Одна дата: "13.08.2025  09:23:14 — 19:28:31"
        return (
            <span className={styles.rangeValue}>
                <span className={styles.dateText}>{formatted.from.date}</span>
                <span className={styles.timeRange}>
                    <strong className={styles.timeText}>{formatted.from.time}</strong>
                    <span className={styles.separator}>—</span>
                    <strong className={styles.timeText}>{formatted.to.time}</strong>
                </span>
            </span>
        );
    }

    // Разные даты: "13.08.2025 09:23:14 — 23.08.2025 19:28:31"
    return (
        <span className={styles.rangeValue}>
            <span className={styles.dateTimeBlock}>
                <span className={styles.dateText}>{formatted.from.date}</span>
                <strong className={styles.timeText}>{formatted.from.time}</strong>
            </span>
            <span className={styles.separator}>—</span>
            <span className={styles.dateTimeBlock}>
                <span className={styles.dateText}>{formatted.to.date}</span>
                <strong className={styles.timeText}>{formatted.to.time}</strong>
            </span>
        </span>
    );
};

export const ChartFooter: React.FC<{ readonly fieldName: string, readonly contextId: Guid;}> = ({ fieldName, contextId }) => {
    const currentRange = useSelector((state: RootState) =>
        selectFieldCurrentRange(state, contextId, fieldName)
    );
    const timeSettings = useSelector((state: RootState) => selectTimeSettings(state));
    const originalRange = useSelector((state: RootState) =>
        selectFieldOriginalRange(state, contextId, fieldName)
    );

    return (
        <div className={styles.chartFooter}>
            {originalRange && (
                <span className={styles.stat}>
                    <span className={styles.statLabel}>Общий:</span>
                    <DateRange
                        fromMs={originalRange.fromMs}
                        toMs={originalRange.toMs}
                        timeSettings={timeSettings}
                    />
                </span>
            )}

            {currentRange && (
                <span className={styles.stat}>
                    <span className={styles.statLabel}>Текущий:</span>
                    <DateRange
                        fromMs={currentRange.fromMs}
                        toMs={currentRange.toMs}
                        timeSettings={timeSettings}
                    />
                </span>
            )}
        </div>
    );
};