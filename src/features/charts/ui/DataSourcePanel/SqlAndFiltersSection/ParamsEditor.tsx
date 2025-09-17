
import * as React from 'react';

import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto';
import type { SqlParam } from '@charts/shared/contracts/chartTemplate/Dtos/SqlParam.ts';
import {SqlParamType} from "@charts/ui/DataSourcePanel/types.ts";

// UI-only mark for auto-created params (not sent to server)
type UiSqlParam = SqlParam & { __auto?: boolean };

type Props = {
    availableFields: FieldDto[];
    params: UiSqlParam[];
    usedKeys: string[];
    onChange: (next: UiSqlParam[]) => void;
};

function asFieldName(f?: FieldDto | string): string {
    if (!f) return '';
    if (typeof f === 'string') return f;
    return f.name ?? '';
}

// -------- parsing helpers for defaultValue --------

function isPlaceholder(raw: string): boolean {
    return /{{\s*[\w:.\-]+\s*}}/.test(raw);
}

function coerceDefaultFromString(raw: string, t?: SqlParamType): unknown {
    // empty -> undefined
    if (raw.trim() === '') return undefined;

    // placeholders are always strings (server resolves)
    if (isPlaceholder(raw)) return raw;

    switch (t) {
        case SqlParamType.Int:
        case SqlParamType.Bigint: {
            const n = Number(raw.replace(',', '.'));
            return Number.isFinite(n) ? Math.trunc(n) : raw;
        }
        case SqlParamType.Double: {
            const n = Number(raw.replace(',', '.'));
            return Number.isFinite(n) ? n : raw;
        }
        case SqlParamType.Bool: {
            const s = raw.trim().toLowerCase();
            if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
            if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
            return raw; // leave as-is if not recognizable
        }
        case SqlParamType.Date:
            // expect YYYY-MM-DD
            return raw;
        case SqlParamType.Timestamp:
        case SqlParamType.Timestamptz:
            // expect ISO-like / datetime-local input (YYYY-MM-DDTHH:mm[:ss])
            return raw;
        case SqlParamType.Uuid:
        case SqlParamType.Text:
        default:
            return raw;
    }
}

function toInputValue(def: unknown, _t?: SqlParamType): string {
    if (def === undefined || def === null) return '';
    if (typeof def === 'string') return def;
    if (typeof def === 'number') return String(def);
    if (typeof def === 'boolean') return def ? 'true' : 'false';
    // any other type -> JSON
    try { return JSON.stringify(def); } catch { return String(def); }
}

export function ParamsEditor({ availableFields, params, usedKeys, onChange }: Props) {
    const usedSet = React.useMemo(() => new Set(usedKeys.map(k => k.trim())), [usedKeys]);

    const add = () => {
        onChange([...(params ?? []), { key: '', description: '', value: undefined, defaultValue: undefined, required: false } as UiSqlParam]);
    };

    const setRow = React.useCallback((idx: number, mut: (row: UiSqlParam) => UiSqlParam) => {
        const list = [...(params ?? [])];
        list[idx] = mut(list[idx]);
        onChange(list);
    }, [params, onChange]);

    const setKey = (idx: number, key: string) => {
        const nextKey = (key ?? '').trim();
        const list = params ?? [];
        // запрет дублей
        const duplicate = list.some((row, j) => j !== idx && String(row.key ?? '').trim() === nextKey && nextKey.length > 0);
        if (duplicate) return;
        setRow(idx, r => ({ ...r, key: nextKey }));
    };
    const setDescription = (idx: number, description: string) => setRow(idx, r => ({ ...r, description }));
    const setFieldName = (idx: number, name: string) => {
        const field = name ? ({ name } as FieldDto) : undefined;
        setRow(idx, r => ({ ...r, field }));
    };
    const setType = (idx: number, type?: SqlParamType) => setRow(idx, r => ({ ...r, type }));
    const setRequired = (idx: number, required: boolean) => setRow(idx, r => ({ ...r, required }));

    const setDefaultRaw = (idx: number, raw: string) => {
        const row = params[idx];
        const effectiveType: SqlParamType | undefined = row.type
            ?? (typeof row.field === 'object' && row.field ? (row.field as FieldDto).sqlParamType as any : undefined);
        const next = coerceDefaultFromString(raw, effectiveType);
        setRow(idx, r => ({ ...r, defaultValue: next }));
    };

    const setDefaultBool = (idx: number, value: boolean) => {
        setRow(idx, r => ({ ...r, defaultValue: value }));
    };

    const remove = (idx: number) => {
        const list = [...(params ?? [])];
        const key = String(list[idx]?.key || '').trim();
        const isAuto = !!list[idx]?.__auto;
        if (key && (usedSet.has(key) || isAuto)) return; // cannot remove used or auto
        list.splice(idx, 1);
        onChange(list);
    };

    // Duplicate key detection for UX
    const keys = (params ?? []).map(p => String(p.key || '').trim()).filter(Boolean);
    const hasDup = new Set(keys).size !== keys.length;

    // enum -> список значений для <option>
    const TYPE_OPTIONS = Object.values(SqlParamType) as SqlParamType[];

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Параметры (Params)</div>

            {hasDup && <div style={{ color: 'orange' }}>Есть дублирующиеся ключи параметров — переименуйте.</div>}

            {(params ?? []).map((p, i) => {
                const key = String(p.key || '').trim();
                const isUsed = key.length > 0 && usedSet.has(key);
                const isAuto = !!p.__auto;
                const fieldName = asFieldName(p.field as any);
                const effectiveType: SqlParamType | undefined = p.type
                    ?? (typeof p.field === 'object' && p.field ? (p.field as FieldDto).sqlParamType as any : undefined);

                return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 160px 120px 1fr auto', gap: 8, alignItems: 'center' }}>
                        <input
                            placeholder="key"
                            value={p.key ?? ''}
                            onChange={e => setKey(i, e.target.value)}
                            disabled={isUsed || isAuto}
                        />
                        <input
                            placeholder="description"
                            value={p.description ?? ''}
                            onChange={e => setDescription(i, e.target.value)}
                        />
                        <select
                            value={fieldName}
                            onChange={e => setFieldName(i, e.target.value)}
                            disabled={isAuto} // автопараметр привязан к полю из where
                        >
                            <option value="">— поле —</option>
                            {availableFields.map(f => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                            ))}
                        </select>
                        <select
                            value={p.type ?? ''}
                            onChange={e => setType(i, (e.target.value || undefined) as SqlParamType | undefined)}
                        >
                            <option value="">auto</option>
                            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={!!p.required}
                                onChange={e => setRequired(i, e.target.checked)}
                            />
                            required
                        </label>

                        {/* Default value editor depends on effective type */}
                        <div>
                            {effectiveType === SqlParamType.Bool ? (
                                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!p.defaultValue}
                                        onChange={e => setDefaultBool(i, e.target.checked)}
                                    />
                                    default
                                </label>
                            ) : effectiveType === SqlParamType.Int || effectiveType === SqlParamType.Bigint ? (
                                <input
                                    type="number"
                                    placeholder="default (int) или {{key}}"
                                    value={toInputValue(p.defaultValue, effectiveType)}
                                    onChange={e => setDefaultRaw(i, e.target.value)}
                                />
                            ) : effectiveType === SqlParamType.Double ? (
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="default (number) или {{key}}"
                                    value={toInputValue(p.defaultValue, effectiveType)}
                                    onChange={e => setDefaultRaw(i, e.target.value)}
                                />
                            ) : effectiveType === SqlParamType.Date ? (
                                <input
                                    type="date"
                                    placeholder="YYYY-MM-DD или {{key}}"
                                    value={toInputValue(p.defaultValue, effectiveType)}
                                    onChange={e => setDefaultRaw(i, e.target.value)}
                                />
                            ) : effectiveType === SqlParamType.Timestamp || effectiveType === SqlParamType.Timestamptz ? (
                                <input
                                    type="datetime-local"
                                    placeholder="YYYY-MM-DDTHH:mm или {{key}}"
                                    value={toInputValue(p.defaultValue, effectiveType)}
                                    onChange={e => setDefaultRaw(i, e.target.value)}
                                />
                            ) : (
                                <input
                                    placeholder="default value или {{key}}"
                                    value={toInputValue(p.defaultValue, effectiveType)}
                                    onChange={e => setDefaultRaw(i, e.target.value)}
                                />
                            )}
                        </div>

                        <button
                            type="button"
                            title={isUsed || isAuto ? 'Нельзя удалить: параметр используется в WHERE/SQL' : 'Удалить'}
                            onClick={() => remove(i)}
                            disabled={isUsed || isAuto}
                        >
                            ✕
                        </button>
                    </div>
                );
            })}

            <div><button type="button" onClick={add}>+ Добавить параметр</button></div>
        </div>
    );
}

export default ParamsEditor;
