import styles from "./ChartFooter.module.css"
import React from "react";
import {useSelector} from "react-redux";
import type {RootState} from "@/store/store.ts";
import {
    selectFieldCurrentRange,
    selectFieldOriginalRange
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import {formatDateWithTimezone} from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";
import {selectTimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";

export const ChartFooter: React.FC<{fieldName: string}> = ({fieldName} ) => {

    const currentRange = useSelector((state: RootState) =>
        selectFieldCurrentRange(state, fieldName)
    );
    const timeSettings = useSelector((state: RootState) => selectTimeSettings(state));
    const originalRange = useSelector((state: RootState) => selectFieldOriginalRange(state, fieldName))


    return (<div className={styles.chartFooter}>


            {originalRange && (
                <span className={styles.stat}>
                    <span className={styles.statLabel}>Общий диапазон:</span>
                    <span className={styles.rangeValue}>
                        {formatDateWithTimezone(
                            originalRange.fromMs,
                            timeSettings,
                            { hour: '2-digit', minute: '2-digit' }
                        )}
                        {' → '}
                        {formatDateWithTimezone(
                            originalRange.toMs,
                            timeSettings,
                            { hour: '2-digit', minute: '2-digit' }
                        )}
                    </span>
                </span>
            )}

            {currentRange && (
                <span className={styles.stat}>
                    <span className={styles.statLabel}>Текущий диапазон:</span>
                    <span className={styles.rangeValue}>
                        {formatDateWithTimezone(
                            currentRange.from,
                            timeSettings,
                            { hour: '2-digit', minute: '2-digit' }
                        )}
                        {' → '}
                        {formatDateWithTimezone(
                            currentRange.to,
                            timeSettings,
                            { hour: '2-digit', minute: '2-digit' }
                        )}
                    </span>
                </span>
            )}

    </div>)
}