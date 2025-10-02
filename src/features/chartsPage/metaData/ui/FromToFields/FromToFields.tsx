import React, { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import s from "./FromToFields.module.css"
import {selectTimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type {TimeRangeBounds} from "@chartsPage/charts/core/store/types/chart.types.ts";
import {
    fromLocalInputValue,
    getTimezoneOffsetFromSettings,
    toDate,
    toLocalInputValue
} from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";

interface FromToFieldsProps {
    range: TimeRangeBounds;
    onChange: (date: Partial<TimeRangeBounds>) => void;
    labelFrom?: string;
    labelTo?: string;
    disabled?: boolean;
}

export const FromToFields: React.FC<FromToFieldsProps> = ({
                                                              range,
                                                              onChange,
                                                              labelFrom = 'From',
                                                              labelTo = 'To',
                                                              disabled,
                                                          }) => {
    const timeSettings = useAppSelector(selectTimeSettings);

    const timezoneOffset = useMemo(() => {
        return getTimezoneOffsetFromSettings(timeSettings);
    }, [timeSettings]);

    const fromStr = useMemo(() => toLocalInputValue(range.from, timeSettings), [range.from, timeSettings]);
    const toStr = useMemo(() => toLocalInputValue(range.to, timeSettings), [range.to, timeSettings]);

    const fromDate = toDate(range.from);
    const toDateV = toDate(range.to);

    const hasRangeError = !!fromDate && !!toDateV && fromDate.getTime() >= toDateV.getTime();

    return (
        <div className={s.container}>
            {timeSettings.useTimeZone && (
                <div className={s.timezoneContainer}>
                    <div className={s.timezoneInfo}>
                        <span className={s.timezoneLabel}>
                            Временная зона: {timeSettings.timeZone} ({timezoneOffset})
                        </span>
                    </div>
                </div>
            )}

            <div className={s.row}>
                <label className={s.label} htmlFor="from">
                    {labelFrom}
                </label>
                <div className={s.row_a}>
                    <input
                        id="from"
                        className={s.input}
                        type="datetime-local"
                        value={fromStr}
                        max={toStr || undefined}
                        onChange={e => onChange({ from: fromLocalInputValue(e.target.value, timeSettings) })}
                        disabled={disabled}
                    />
                    <div className={s.helpers}>
                        <button
                            type="button"
                            className={s.helperBtn}
                            onClick={() => onChange({ from: undefined })}
                            disabled={disabled}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className={s.helperBtn}
                            onClick={() => onChange({ from: new Date() })}
                            disabled={disabled}
                        >
                            Now
                        </button>
                    </div>
                </div>
            </div>

            <div className={s.row}>
                <label className={s.label} htmlFor="to">
                    {labelTo}
                </label>
                <div className={s.row_a}>
                    <input
                        id="to"
                        className={s.input}
                        type="datetime-local"
                        value={toStr}
                        min={fromStr || undefined}
                        onChange={e => onChange({ to: fromLocalInputValue(e.target.value, timeSettings) })}
                        disabled={disabled}
                    />
                    <div className={s.helpers}>
                        <button
                            type="button"
                            className={s.helperBtn}
                            onClick={() => onChange({ to: undefined })}
                            disabled={disabled}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className={s.helperBtn}
                            onClick={() => onChange({ to: new Date() })}
                            disabled={disabled}
                        >
                            Now
                        </button>
                    </div>
                </div>
            </div>

            {hasRangeError && (
                <div className={s.error}>«{labelFrom}» должен быть меньше «{labelTo}»</div>
            )}
        </div>
    );
};

export default FromToFields;