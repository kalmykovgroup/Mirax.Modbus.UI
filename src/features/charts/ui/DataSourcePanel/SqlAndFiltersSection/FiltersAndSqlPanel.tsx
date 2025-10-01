import * as React from 'react';

import { WhereEditor } from './WhereEditor';
import { ParamsEditor } from './ParamsEditor';
import { SqlEditor } from './SqlEditor';

import { useSelector } from 'react-redux';

import {SqlParamType} from "@charts/ui/DataSourcePanel/types.ts";

import {useAppDispatch} from "@/store/hooks.ts";
import type {SqlParam} from "@charts/template/shared/dtos/SqlParam.ts";
import type {FieldDto} from "@charts/metaData/shared/dtos/FieldDto.ts";
import type {FilterClause} from "@charts/template/shared/dtos/FilterClause.ts";
import type {SqlFilter} from "@charts/template/shared/dtos/SqlFilter.ts";
import {
    selectActiveTemplate,
    selectFields, setActiveTemplateParams,
    setActiveTemplateSql,
    setActiveTemplateWhere
} from "@charts/template/store/chartsTemplatesSlice.ts";

// UI-only mark for auto-created params (not sent to server)
type UiSqlParam = SqlParam & { __auto?: boolean };

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
    else if (Array.isArray(v)) v.forEach(x => { if (typeof x === 'string') add(x); });
    return keys;
}

// извлекает ключ, только если ВСЁ значение — это плейсхолдер
function extractStrictKey(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const m = v.match(KeyStrictRx);
    return m ? (m[1] || '').trim() : null;
}

function extractUsedKeys(where: FilterClause[] | undefined, sql: SqlFilter | undefined): string[] {
    const keys: string[] = [];
    where?.forEach(c => {
        extractKeysFromValue((c as any).value).forEach(k => { if (!keys.includes(k)) keys.push(k); });
    });
    if (sql?.whereSql) {
        extractKeysFromValue(sql.whereSql).forEach(k => { if (!keys.includes(k)) keys.push(k); });
    }
    return keys;
}

/** Тип параметра для поля — сперва server-side enum (field.sqlParamType), потом fallback для обратной совместимости */
function guessTypeFromField(f?: FieldDto): SqlParamType | undefined {
    if (!f) return undefined;
    if ((f as any).sqlParamType) return (f as any).sqlParamType as SqlParamType;

    // Fallback (старые контракты)
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

export function FiltersAndSqlPanel() {
    const dispatch = useAppDispatch();

    const template = useSelector(selectActiveTemplate);
    const fields = useSelector(selectFields) ?? [];

    // требуемая сигнатура стейта — допускаем undefined
    const [where, setWhere] = React.useState<FilterClause[] | undefined>(template.where);
    const [sql, setSql] = React.useState<SqlFilter | undefined>(template.sql);
    const [paramsUi, setParamsUi] = React.useState<UiSqlParam[] | undefined>(
        (template.params ?? []).map(p => ({ ...p, __auto: false }))
    );

    // реф для отслеживания переименований ключей (по индексам WHERE)
    const prevWhereRef = React.useRef<FilterClause[] | undefined>(template.where);

    // если шаблон обновили извне — синхронизируем локальный стейт
    React.useEffect(() => {
        setWhere(template.where);
        setSql(template.sql);
        setParamsUi((template.params ?? []).map(p => ({ ...p, __auto: false })));
        prevWhereRef.current = template.where;
    }, [template.where, template.sql, template.params]);

    // Reconcile: создание/удаление/переименование автопараметров по факту изменений WHERE/SQL
    const reconcileCommit = React.useCallback((w: FilterClause[] | undefined, s: SqlFilter | undefined, p: UiSqlParam[] | undefined) => {
        const used = extractUsedKeys(w, s);
        const usedSet = new Set(used.map(k => k.trim()));

        // 1) Отследить переименования плейсхолдеров в WHERE (по индексам строк)
        const renames: Array<{ oldKey: string, newKey: string }> = [];
        const oldW = prevWhereRef.current ?? [];
        const newW = w ?? [];
        const len = Math.min(oldW.length, newW.length);
        for (let i = 0; i < len; i++) {
            const oldKey = extractStrictKey((oldW[i] as any)?.value);
            const newKey = extractStrictKey((newW[i] as any)?.value);
            if (oldKey && newKey && oldKey !== newKey) renames.push({ oldKey, newKey });
        }

        let next: UiSqlParam[] = [...(p ?? [])];

        // 1.1 Применить переименования к параметрам без создания дублей
        for (const { oldKey, newKey } of renames) {
            const idxOld = next.findIndex(x => String(x.key || '').trim() === oldKey);
            if (idxOld === -1) continue;
            const idxNew = next.findIndex(x => String(x.key || '').trim() === newKey);
            if (idxNew !== -1) {
                const a = next[idxOld];
                const b = next[idxNew];
                if (a?.__auto && !b?.__auto) {
                    next.splice(idxOld, 1);
                } else if (!a?.__auto && b?.__auto) {
                    next.splice(idxNew, 1);
                    next[idxOld] = { ...a, key: newKey };
                } else if (a?.__auto && b?.__auto) {
                    if (idxNew > idxOld) {
                        next[idxOld] = { ...a, key: newKey };
                        next.splice(idxNew, 1);
                    } else {
                        next[idxOld] = { ...a, key: newKey };
                    }
                } else {
                    next.splice(idxOld, 1);
                }
            } else {
                next[idxOld] = { ...next[idxOld], key: newKey };
            }
        }

        // 2) Убрать дубли и «устаревшие» автопараметры (неиспользуемые ключи)
        const seen = new Set<string>();
        const uniq: UiSqlParam[] = [];
        for (const p0 of next) {
            const key = String(p0.key || '').trim();
            if (!key) continue;
            if (p0.__auto && !usedSet.has(key)) continue; // авто-параметр больше не нужен

            if (seen.has(key)) {
                const keepIdx = uniq.findIndex(x => String(x.key || '').trim() === key);
                if (keepIdx >= 0) {
                    const keep = uniq[keepIdx];
                    if (keep?.__auto && !p0.__auto) uniq.splice(keepIdx, 1, p0); // приоритет «ручного»
                }
                continue;
            }
            seen.add(key);
            uniq.push(p0);
        }
        next = uniq;

        // 3) Добавить недостающие автопараметры для всех используемых ключей
        const present = new Set(next.map(x => String(x.key || '').trim()).filter(Boolean));
        for (const key of usedSet) {
            if (!present.has(key)) {
                let fieldForKey: FieldDto | undefined;
                for (const c of (w ?? [])) {
                    const vals = extractKeysFromValue((c as any).value);
                    if (vals.includes(key)) {
                        const fname = asFieldName((c as any).field);
                        fieldForKey = (fields.find(f => f.name === fname)
                            || (typeof (c as any).field === 'object' ? (c as any).field as FieldDto : undefined));
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

        // Финал: обновляем локально и диспатчим в стор
        prevWhereRef.current = w;
        setWhere(w);
        setSql(s);
        setParamsUi(next);

        const cleanParams: SqlParam[] = next.map(({ __auto, ...rest }) => rest);
        dispatch(setActiveTemplateWhere(w));
        dispatch(setActiveTemplateSql(s));
        dispatch(setActiveTemplateParams(cleanParams));
    }, [fields, dispatch]);

    const usedKeys = React.useMemo(() => extractUsedKeys(where, sql), [where, sql]);

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <WhereEditor
                availableFields={fields}
                where={where ?? []}
                onChangeImmediate={(next) => { setWhere(next); }}
                onCommit={(next) => reconcileCommit(next, sql, paramsUi)}
            />

            <ParamsEditor
                availableFields={fields}
                params={paramsUi ?? []}
                usedKeys={usedKeys}
                onChange={(next) => {
                    setParamsUi(next);
                    const cleanParams: SqlParam[] = next.map(({ __auto, ...rest }) => rest);
                    dispatch(setActiveTemplateParams(cleanParams));
                }}
            />

            <SqlEditor
                sql={sql}
                onChangeImmediate={(next) => { setSql(next); }}
                onCommit={(next) => reconcileCommit(where, next, paramsUi)}
            />
        </div>
    );
}

