import React, { useMemo } from 'react';
import { useAppSelector } from '@/baseStore/hooks.ts';
import s from "./FromToFields.module.css"
import {selectTimeSettings} from "@chartsPage/charts/core/store/chartsSettingsSlice.ts";
import type {TimeRangeBounds} from "@chartsPage/charts/core/store/types/chart.types.ts";
import {
    fromLocalInputValue,
    getTimezoneOffsetFromSettings,
    toLocalInputValue
} from "@chartsPage/charts/ui/TimeZonePicker/timezoneUtils.ts";

interface FromToFieldsProps {
    range: TimeRangeBounds;
    onChange: (range: TimeRangeBounds) => void;
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

    const fromStr = useMemo(() => toLocalInputValue(range.fromMs, timeSettings), [range.fromMs, timeSettings]);
    const toStr = useMemo(() => toLocalInputValue(range.toMs, timeSettings), [range.toMs, timeSettings]);


    const hasRangeError = !!range.fromMs && !!range.toMs && range.fromMs >= range.toMs;

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
                        onChange={e => onChange({ fromMs: fromLocalInputValue(e.target.value, timeSettings)?.getTime(), toMs:range.toMs })}
                        disabled={disabled}
                    />
                    <div className={s.helpers}>
                        <button
                            type="button"
                            className={s.helperBtn}
                            onClick={() => onChange({ fromMs: undefined, toMs:range.toMs })}
                            disabled={disabled}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className={s.helperBtn}
                            onClick={() => onChange({ fromMs: new Date().getTime(), toMs:range.toMs })}
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
                        onChange={e => onChange({ toMs: fromLocalInputValue(e.target.value, timeSettings)?.getTime(), fromMs:range.fromMs  })}
                        disabled={disabled}
                    />
                    <div className={s.helpers}>
                        <button
                            type="button"
                            className={s.helperBtn}
                            onClick={() => onChange({ toMs: undefined, fromMs:range.fromMs  })}
                            disabled={disabled}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className={s.helperBtn}
                            onClick={() => onChange({ toMs: new Date().getTime(), fromMs:range.fromMs  })}
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