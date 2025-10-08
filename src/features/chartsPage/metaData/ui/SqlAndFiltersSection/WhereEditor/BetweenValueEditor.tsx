import {toNumber} from "@chartsPage/metaData/ui/SqlAndFiltersSection/WhereEditor/ArrayValueEditor.tsx";
import React from "react";

/** Редактор для диапазона (between) */
export function BetweenValueEditor({
                                value,
                                isNumeric,
                                onChange
                            }: {
    value: unknown;
    isNumeric?: boolean | undefined;
    onChange: (value: [string | number, string | number]) => void;
}): React.JSX.Element {
    const arr = Array.isArray(value) && value.length === 2 ? value : ['', ''];
    const [min, max] = arr;

    const handleMinChange = (raw: string) => {
        const newMin = isNumeric ? toNumber(raw) : raw;
        onChange([newMin, max]);
    };

    const handleMaxChange = (raw: string) => {
        const newMax = isNumeric ? toNumber(raw) : raw;
        onChange([min, newMax]);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <input
                type="text"
                placeholder="min"
                value={String(min || '')}
                onChange={e => handleMinChange(e.target.value)}
            />
            <input
                type="text"
                placeholder="max"
                value={String(max || '')}
                onChange={e => handleMaxChange(e.target.value)}
            />
        </div>
    );
}