import * as React from "react";

function parseArray(raw: string, isNumeric?: boolean): (string | number)[] {
    return raw.split(',')
        .map(x => x.trim())
        .filter(Boolean)
        .map(x => isNumeric ? toNumber(x) : x);
}


export function toNumber(s: string): number | string {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : s;
}



/** Редактор для массива значений */
export function ArrayValueEditor({
                              value,
                              isNumeric,
                              onChange
                          }: {
    value: unknown;
    isNumeric?: boolean | undefined;
    onChange: (value: (string | number)[]) => void;
}): React.JSX.Element {
    const strValue = Array.isArray(value) ? value.join(', ') : '';

    const handleChange = (raw: string) => {
        const parsed = parseArray(raw, isNumeric);
        onChange(parsed);
    };

    return (
        <input
            type="text"
            placeholder={isNumeric ? 'x, y, z' : 'a, b, c'}
            value={strValue}
            onChange={e => handleChange(e.target.value)}
        />
    );
}