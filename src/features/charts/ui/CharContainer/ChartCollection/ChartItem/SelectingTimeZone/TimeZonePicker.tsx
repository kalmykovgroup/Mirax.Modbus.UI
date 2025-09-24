import React, {useCallback, useMemo, useState} from "react";
import {useAppDispatch} from "@/store/hooks.ts";
import {STYLE_PRESETS} from "@charts/ui/CharContainer/ChartCollection/ChartItem/lib/theme.ts";
import styles from "@charts/ui/CharContainer/ChartCollection/ChartCollection.module.css";
import SelectStylePicker
    from "@charts/ui/CharContainer/ChartCollection/ChartItem/SelectStylePicker/SelectStylePicker.tsx";
import type {TimeRange} from "@charts/store/chartsSlice.ts";
import type {
    ExtendedRangeChangeMeta
} from "@charts/ui/CharContainer/ChartCollection/ChartItem/types/RangeChangeMeta.ts";
import type {TimeSettings} from "@charts/ui/CharContainer/ChartCollection/ChartItem/lib/dataAdapters.ts";

interface SelectingTimeZoneProps {
    setTimeSettings: () => TimeSettings;
}
const SelectingTimeZone: React.FC<SelectingTimeZoneProps> = ({setTimeSettings} ) => {
    const dispatch = useAppDispatch();


    const toggleTz = () =>
        setTimeSettings((s) => ({ ...s, useTimeZone: !s.useTimeZone }));

    const changeTz = (e: React.ChangeEvent<HTMLSelectElement>) =>
        setTimeSettings((s) => ({ ...s, timeZone: e.target.value }));
    // -------------------------------------


    const timeZones = useMemo(
        () => ['UTC', 'Europe/Helsinki', 'Europe/Moscow', 'America/New_York', 'Asia/Almaty', 'Asia/Tokyo'],
        []
    );



    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={timeSettings.useTimeZone} onChange={toggleTz} />
                Показывать в часовом поясе
            </label>
            <select value={timeSettings.timeZone} onChange={changeTz} disabled={!timeSettings.useTimeZone}>
                {timeZones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                ))}
            </select>
            <span style={{ opacity: 0.7, fontSize: 12 }}>
          (в запрос уходит UTC ISO, диапазон не выходит за исходные границы)
        </span>
        </div>
    )
}