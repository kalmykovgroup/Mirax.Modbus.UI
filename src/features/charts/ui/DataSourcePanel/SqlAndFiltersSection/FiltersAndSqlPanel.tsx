
import * as React from 'react';

import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto';
import type { FilterClause } from '@charts/shared/contracts/chartTemplate/Dtos/FilterClause.ts';
import type { SqlFilter } from '@charts/shared/contracts/chartTemplate/Dtos/SqlFilter.ts';
import type { SqlParam } from '@charts/shared/contracts/chartTemplate/Dtos/SqlParam.ts';
import { WhereEditor } from './WhereEditor';
import { ParamsEditor } from './ParamsEditor';
import { SqlEditor } from './SqlEditor';
import {SqlParamType} from "@charts/ui/DataSourcePanel/types.ts";

// UI-only mark for auto-created params (not sent to server)
type UiSqlParam = SqlParam & { __auto?: boolean };

type Props = {
    availableFields: FieldDto[];
    value: {
        where: FilterClause[];
        params: SqlParam[];
        sql: SqlFilter | null;
    };
    onChange: (next: Props['value']) => void;
};

const KeyRx = /{{\s*([\w:.\-]+)\s*}}/g;
const KeyStrictRx = /^{{\s*([\w:.\-]+)\s*}}$/;

function asFieldName(f: FieldDto | string | undefined): string {
    if (!f) return '';
    if (typeof (f as any) === 'string') return f as string;
    return (f as FieldDto).name ?? '';
}

function extractKeysFromValue(v: unknown): string[] {
    const keys: string[] = [];
    const add = (s: string) => {
        let m: RegExpExecArray | null;
        KeyRx.lastIndex = 0;
        while ((m = KeyRx.exec(s)) !== null) {
            const key = (m[1] || '').trim();
            if (key && !keys.includes(key)) keys.push(key);
        }
    };
    if (typeof v === 'string') add(v);
    else if (Array.isArray(v)) {
        v.forEach(x => {
            if (typeof x === 'string') add(x);
        });
    }
    return keys;
}

// извлекает ключ, только если ВСЁ значение — это плейсхолдер
function extractStrictKey(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const m = v.match(KeyStrictRx);
    return m ? (m[1] || '').trim() : null;
}

function extractUsedKeys(where: FilterClause[], sql: SqlFilter | null): string[] {
    const keys: string[] = [];
    where?.forEach(c => {
        extractKeysFromValue((c as any).value).forEach(k => { if (!keys.includes(k)) keys.push(k); });
    });
    if (sql?.whereSql) {
        extractKeysFromValue(sql.whereSql).forEach(k => { if (!keys.includes(k)) keys.push(k); });
    }
    return keys;
}

/**
 * Тип параметра для поля: сначала серверный enum (field.sqlParamType),
 * затем fallback по исходному типу (на случай старого контракта).
 */
function guessTypeFromField(f?: FieldDto): SqlParamType | undefined {
    if (!f) return undefined;
    if ((f as any).sqlParamType) return (f as any).sqlParamType as SqlParamType;

    // Fallback (редко нужен)
    if ((f as any).isTime) {
        const t = ((f as any).type || '').toLowerCase();
        if (t.includes('tz')) return SqlParamType.Timestamptz;
        if (t.includes('timestamp')) return SqlParamType.Timestamp;
        if (t.includes('date')) return SqlParamType.Date;
    }
    if ((f as any).isNumeric) {
        const t = ((f as any).type || '').toLowerCase();
        if (t.includes('double') || t.includes('real') || t.includes('numeric')) return SqlParamType.Double;
        if (t.includes('bigint')) return SqlParamType.Bigint;
        return SqlParamType.Int;
    }
    const t = ((f as any).type || '').toLowerCase();
    if (t.includes('uuid')) return SqlParamType.Uuid;
    if (t.includes('bool')) return SqlParamType.Bool;
    return SqlParamType.Text;
}

export function FiltersAndSqlPanel({ availableFields, value, onChange }: Props) {
    const [where, setWhere] = React.useState<FilterClause[]>(value.where ?? []);
    const [sql, setSql] = React.useState<SqlFilter | null>(value.sql ?? null);
    const [paramsUi, setParamsUi] = React.useState<UiSqlParam[]>(
        (value.params ?? []).map(p => ({ ...p, __auto: false }))
    );

    // для отслеживания переименований ключей в where (по индексам)
    const prevWhereRef = React.useRef<FilterClause[]>(value.where ?? []);

    // ---------- helpers ----------
    // 1) Only update local state from props (NO onChange here)
    const hydrateFromProps = React.useCallback((w: FilterClause[], s: SqlFilter | null, p: SqlParam[]) => {
        setWhere(w);
        setSql(s);
        setParamsUi((p ?? []).map(pp => ({ ...pp, __auto: false })));
        prevWhereRef.current = w;
    }, []);


    // 3) Commit with reconcile (create/remove/rename auto params only here)
    const reconcileCommit = React.useCallback((w: FilterClause[], s: SqlFilter | null, p: UiSqlParam[]) => {
        const used = extractUsedKeys(w, s);
        const usedSet = new Set(used.map(k => k.trim()));

        // --- 3.1. применяем переименования (по индексам строк)
        const renames: Array<{ oldKey: string, newKey: string }> = [];
        const oldW = prevWhereRef.current ?? [];
        const len = Math.min(oldW.length, w.length);
        for (let i = 0; i < len; i++) {
            const oldKey = extractStrictKey((oldW[i] as any)?.value);
            const newKey = extractStrictKey((w[i] as any)?.value);
            if (oldKey && newKey && oldKey !== newKey) {
                renames.push({ oldKey, newKey });
            }
        }

        let next: UiSqlParam[] = [...(p || [])];

        // применяем переименования к параметрам, без создания дублей
        for (const { oldKey, newKey } of renames) {
            const idxOld = next.findIndex(x => String(x.key || '').trim() === oldKey);
            if (idxOld === -1) continue;
            const idxNew = next.findIndex(x => String(x.key || '').trim() === newKey);
            if (idxNew !== -1) {
                const a: UiSqlParam | undefined = next[idxOld];
                const b: UiSqlParam | undefined  = next[idxNew];

                if(a === undefined) throw Error(`UiSqlParam is not defined 'a' 'next[idxOld]' idxOld = '${idxOld}'`);
                if(b === undefined) throw Error("UiSqlParam is not defined 'b' 'next[idxOld]' idxOld = '${idxOld}'");

                if (a.__auto && !b.__auto) {
                    // был авто, новый — пользовательский: удаляем авто-старый
                    next.splice(idxOld, 1);
                } else if (!a.__auto && b.__auto) {
                    // старый пользовательский, новый авто — убираем авто, переименуем старый
                    next.splice(idxNew, 1);
                    next[idxOld] = { ...a, key: newKey };
                } else if (a.__auto && b.__auto) {
                    // оба авто — оставим первый, переименуем его, второй удалим
                    if (idxNew > idxOld) {
                        next[idxOld] = { ...a, key: newKey };
                        next.splice(idxNew, 1);
                    } else {
                        // безопасный fallback
                        next[idxOld] = { ...a, key: newKey };
                    }
                } else {
                    // оба пользовательские — оставим тот, который уже с newKey, удалим старый
                    next.splice(idxOld, 1);
                }
            } else {
                // нет конфликта — просто переименуем
                next[idxOld] = { ...next[idxOld], key: newKey };
            }
        }

        // --- 3.2. убираем дубли, чистим устаревшие авто
        const seen = new Set<string>();
        const uniq: UiSqlParam[] = [];
        for (const p0 of next) {
            const key = String(p0.key || '').trim();
            if (!key) continue;
            if (p0.__auto && !usedSet.has(key)) {
                // авто-параметр больше не используется — пропускаем
                continue;
            }
            if (seen.has(key)) {
                // если дубликат — отдаём приоритет не-авто
                const keepIdx = uniq.findIndex(x => String(x.key || '').trim() === key);
                if (keepIdx >= 0) {
                    const keep: UiSqlParam | undefined  = uniq[keepIdx];

                    if(keep === undefined) throw Error("UiSqlParam is not defined 'b' 'next[idxOld]' idxOld = '${idxOld}'");

                    if (keep.__auto && !p0.__auto) {
                        uniq.splice(keepIdx, 1, p0); // заменяем не-авто
                    }
                }
                continue;
            }
            seen.add(key);
            uniq.push(p0);
        }
        next = uniq;

        // --- 3.3. добавляем недостающие авто-параметры
        const present = new Set(next.map(x => String(x.key || '').trim()).filter(Boolean));
        for (const key of usedSet) {
            if (!present.has(key)) {
                let fieldForKey: FieldDto | undefined;
                for (const c of (w || [])) {
                    const vals = extractKeysFromValue((c as any).value);
                    if (vals.includes(key)) {
                        const fname = asFieldName((c as any).field);
                        fieldForKey = availableFields.find(f => f.name === fname)
                            || (typeof (c as any).field === 'object' ? (c as any).field as FieldDto : undefined);
                        break;
                    }
                }
                next.push({
                    key,
                    description: '',
                    value: undefined,
                    defaultValue: undefined,
                    field: fieldForKey,
                    type: guessTypeFromField(fieldForKey),
                    required: true,
                    __auto: true,
                });
            }
        }

        // обновляем prevWhere и пробрасываем наверх
        prevWhereRef.current = w;
        setWhere(w);
        setSql(s);
        setParamsUi(next);
        const cleanParams: SqlParam[] = next.map(({ __auto, ...rest }) => rest);
        onChange({ where: w, params: cleanParams, sql: s });
    }, [availableFields, onChange]);

    // ---------- sync local state when parent props change ----------
    React.useEffect(() => {
        hydrateFromProps(value.where ?? [], value.sql ?? null, value.params ?? []);
    }, [value.where, value.sql, value.params, hydrateFromProps]);

    const usedKeys = React.useMemo(() => extractUsedKeys(where, sql), [where, sql]);

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <WhereEditor
                availableFields={availableFields}
                where={where}
                onChangeImmediate={(next) => { setWhere(next); setSql(sql); /* только локально */ }}
                onCommit={(next) => reconcileCommit(next, sql, paramsUi)}      // commit — автопараметры/переименования
            />

            <ParamsEditor
                availableFields={availableFields}
                params={paramsUi}
                usedKeys={usedKeys}
                onChange={(next) => {
                    setParamsUi(next);
                    const cleanParams: SqlParam[] = next.map(({ __auto, ...rest }) => rest);
                    onChange({ where, params: cleanParams, sql });
                }}
            />

            <SqlEditor
                sql={sql}
                onChangeImmediate={(next) => { setSql(next); /* локально */ }}
                onCommit={(next) => reconcileCommit(where, next, paramsUi)}
            />
        </div>
    );
}

export default FiltersAndSqlPanel;
