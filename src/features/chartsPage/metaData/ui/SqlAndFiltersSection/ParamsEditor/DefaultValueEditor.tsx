import {SqlParamType} from "@chartsPage/template/shared/dtos/SqlParamType.ts";
import React from "react";

function formatDefaultValue(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
}

function parseDefaultValue(raw: string, type?: SqlParamType): unknown {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;

    switch (type) {
        case SqlParamType.Int:
        case SqlParamType.Bigint: {
            const n = Number(trimmed.replace(',', '.'));
            return Number.isFinite(n) ? Math.trunc(n) : trimmed;
        }
        case SqlParamType.Double: {
            const n = Number(trimmed.replace(',', '.'));
            return Number.isFinite(n) ? n : trimmed;
        }
        case SqlParamType.Bool: {
            const lower = trimmed.toLowerCase();
            if (['true', '1', 'yes', 'y'].includes(lower)) return true;
            if (['false', '0', 'no', 'n'].includes(lower)) return false;
            return trimmed;
        }
        default:
            return trimmed;
    }
}


/** Редактор для defaultValue в зависимости от типа */
export function DefaultValueEditor({
                                value,
                                type,
                                onChange
                            }: {
    value: unknown;
    type?: SqlParamType | undefined;
    onChange: (value: unknown) => void;
}): React.JSX.Element {
    if (type === SqlParamType.Bool) {
        return (
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={!!value}
                    onChange={e => onChange(e.target.checked)}
                />
                <span style={{ fontSize: 13 }}>default</span>
            </label>
        );
    }

    if (type === SqlParamType.Int || type === SqlParamType.Bigint) {
        return (
            <input
                type="number"
                placeholder="default"
                value={formatDefaultValue(value)}
                onChange={e => onChange(parseDefaultValue(e.target.value, type))}
                style={{ width: '100%' }}
            />
        );
    }

    if (type === SqlParamType.Double) {
        return (
            <input
                type="number"
                step="any"
                placeholder="default"
                value={formatDefaultValue(value)}
                onChange={e => onChange(parseDefaultValue(e.target.value, type))}
                style={{ width: '100%' }}
            />
        );
    }

    if (type === SqlParamType.Date) {
        return (
            <input
                type="date"
                value={formatDefaultValue(value)}
                onChange={e => onChange(e.target.value || undefined)}
                style={{ width: '100%' }}
            />
        );
    }

    if (type === SqlParamType.Timestamp || type === SqlParamType.Timestamptz) {
        return (
            <input
                type="datetime-local"
                value={formatDefaultValue(value)}
                onChange={e => onChange(e.target.value || undefined)}
                style={{ width: '100%' }}
            />
        );
    }

    // Text, Uuid, или unknown
    return (
        <input
            type="text"
            placeholder="default"
            value={formatDefaultValue(value)}
            onChange={e => onChange(e.target.value || undefined)}
            style={{ width: '100%' }}
        />
    );
}