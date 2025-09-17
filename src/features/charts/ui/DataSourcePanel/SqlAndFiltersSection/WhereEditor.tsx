
import type { FieldDto } from '@charts/shared/contracts/metadata/Dtos/FieldDto';
import type { FilterClause } from '@charts/shared/contracts/chartTemplate/Dtos/FilterClause.ts';
import { FilterOp } from '@charts/shared/contracts/chart/Types/FilterOp';

type Props = {
    availableFields: FieldDto[];
    where: FilterClause[];
    onChangeImmediate: (next: FilterClause[]) => void; // on typing
    onCommit: (next: FilterClause[]) => void;          // on blur / add / remove
};

type ValueKind = 'none' | 'single' | 'array' | 'between';

const OP_DEFS: { value: FilterOp; label: string; kind: ValueKind }[] = [
    { value: FilterOp.Eq,       label: '=',       kind: 'single' },
    { value: FilterOp.Ne,       label: '≠',       kind: 'single' },
    { value: FilterOp.Gt,       label: '>',       kind: 'single' },
    { value: FilterOp.Gte,      label: '≥',       kind: 'single' },
    { value: FilterOp.Lt,       label: '<',       kind: 'single' },
    { value: FilterOp.Lte,      label: '≤',       kind: 'single' },
    { value: FilterOp.Between,  label: 'between', kind: 'between' },
    { value: FilterOp.In,       label: 'in',      kind: 'array' },
    { value: FilterOp.Nin,      label: 'not in',  kind: 'array' },
    { value: FilterOp.Like,     label: 'like',    kind: 'single' },
    { value: FilterOp.ILike,    label: 'ilike',   kind: 'single' },
    { value: FilterOp.IsNull,   label: 'is null', kind: 'none' },
    { value: FilterOp.NotNull,  label: 'not null',kind: 'none' },
];

function toNumberMaybe(s: string): number | string {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : s;
}

function asFieldName(f: FieldDto | string | undefined): string {
    if (!f) return '';
    if (typeof (f as any) === 'string') return f as string;
    return (f as FieldDto).name ?? '';
}

function parseArrayInput(raw: string, isNumeric?: boolean): (string|number)[] {
    const items = (raw || '').split(',').map(x => x.trim()).filter(Boolean);
    return items.map(x => isNumeric ? toNumberMaybe(x) : x);
}

// --- placeholder helpers ---
function isPlaceholder(raw: string): boolean {
    return /^{{\s*[\w:.\-]+\s*}}$/.test(raw);
}
function extractPlaceholderKey(raw: string): string {
    const m = raw.match(/^{{\s*([\w:.\-]+)\s*}}$/);
    return m ? m[1] : '';
}
function makePlaceholder(key: string): string {
    return `{{${key}}}`;
}

export function WhereEditor({ availableFields, where, onChangeImmediate, onCommit }: Props) {
    const add = () => {
        const first = availableFields?.[0]?.name ?? '';
        const fld: FieldDto = { name: first } as any;
        const next = [...(where ?? []), { field: fld, op: FilterOp.Eq, value: '' } as FilterClause];
        onChangeImmediate(next);
        onCommit(next); // adding a row is a commit point
    };

    const patch = (idx: number, p: Partial<FilterClause>, commit = false) => {
        const list = [...(where ?? [])];
        list[idx] = { ...list[idx], ...p } as FilterClause;
        if (commit) onCommit(list);
        else onChangeImmediate(list);
    };

    const remove = (idx: number) => {
        const list = [...(where ?? [])];
        list.splice(idx, 1);
        onChangeImmediate(list);
        onCommit(list); // removal is a commit point
    };

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Фильтры (WHERE)</div>

            {(where ?? []).map((c, i) => {
                const field = availableFields.find(f => f.name === asFieldName((c as any).field));
                const isNumeric = field?.isNumeric;
                const opDef = OP_DEFS.find(o => o.value === (c as any).op) ?? OP_DEFS[0];
                const kind = opDef.kind;

                return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr auto', gap: 8, alignItems: 'center' }}>
                        <select
                            value={asFieldName((c as any).field)}
                            onChange={e => patch(i, { field: { name: e.target.value } as FieldDto }, true /* commit */)}
                        >
                            {availableFields.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                        </select>

                        <select
                            value={(c as any).op as FilterOp}
                            onChange={e => {
                                const nextOp = e.target.value as unknown as FilterOp;
                                let nextVal: unknown = (c as any).value;
                                const nextKind = (OP_DEFS.find(o => o.value === nextOp) ?? OP_DEFS[0]).kind;
                                if (nextKind === 'none') nextVal = undefined;
                                if (nextKind === 'single' && Array.isArray(nextVal)) nextVal = '';
                                if (nextKind === 'array' && !Array.isArray(nextVal)) nextVal = [];
                                if (nextKind === 'between') nextVal = Array.isArray(nextVal) && nextVal.length === 2 ? nextVal : ['', ''];
                                patch(i, { op: nextOp as any, value: nextVal } as any, true /* commit */);
                            }}
                        >
                            {OP_DEFS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        <div>
                            {kind === 'none' && <i style={{ opacity: .7 }}>—</i>}

                            {kind === 'single' && (() => {
                                const raw = (typeof (c as any).value === 'string' || typeof (c as any).value === 'number')
                                    ? String((c as any).value) : '';
                                const keyMode = isPlaceholder(raw);
                                const keyOnly = keyMode ? extractPlaceholderKey(raw) : '';
                                const valueStr = keyMode ? '' : raw;

                                return (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <select
                                            value={keyMode ? 'key' : 'value'}
                                            onChange={e => {
                                                const mode = e.target.value as 'value' | 'key';
                                                if (mode === 'key') {
                                                    const nextKey = keyOnly || '';
                                                    patch(i, { value: makePlaceholder(nextKey) } as any, true /* commit */);
                                                } else {
                                                    patch(i, { value: '' } as any, true /* commit */);
                                                }
                                            }}
                                        >
                                            <option value="value">значение</option>
                                            <option value="key">ключ</option>
                                        </select>

                                        {keyMode ? (
                                            <input
                                                placeholder="key"
                                                value={keyOnly}
                                                onChange={e => {
                                                    const k = e.target.value.trim();
                                                    patch(i, { value: makePlaceholder(k) } as any, false /* immediate */);
                                                }}
                                                onBlur={e => {
                                                    const k = e.target.value.trim();
                                                    patch(i, { value: makePlaceholder(k) } as any, true /* commit */);
                                                }}
                                            />
                                        ) : (
                                            <input
                                                placeholder={isNumeric ? 'число или {{key}}' : 'значение или {{key}}'}
                                                value={valueStr}
                                                onChange={e => {
                                                    const s = e.target.value;
                                                    patch(i, { value: s } as any, false /* immediate */);
                                                }}
                                                onBlur={e => {
                                                    const s = e.target.value;
                                                    patch(i, { value: s } as any, true /* commit */);
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })()}

                            {kind === 'array' && (
                                <input
                                    placeholder={isNumeric ? 'x, y, z или {{key}}' : 'a, b, c или {{key}}'}
                                    value={Array.isArray((c as any).value) ? ((c as any).value as any[]).join(', ') : (typeof (c as any).value === 'string' ? String((c as any).value) : '')}
                                    onChange={e => {
                                        const raw = e.target.value;
                                        const val = raw.includes('{{') ? raw : parseArrayInput(raw, !!isNumeric);
                                        onChangeImmediate(Object.assign([...where], { [i]: { ...(where[i] as any), value: val } } as any));
                                    }}
                                    onBlur={e => {
                                        const raw = e.target.value;
                                        const val = raw.includes('{{') ? raw : parseArrayInput(raw, !!isNumeric);
                                        patch(i, { value: val } as any, true);
                                    }}
                                />
                            )}

                            {kind === 'between' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    <input
                                        placeholder={isNumeric ? 'min или {{key}}' : 'min или {{key}}'}
                                        value={Array.isArray((c as any).value) ? String(((c as any).value as any[])[0] ?? '') : ''}
                                        onChange={e => {
                                            const a = Array.isArray((c as any).value) ? [...((c as any).value as any[])] : ['', ''];
                                            const raw = e.target.value;
                                            a[0] = raw.includes('{{') ? raw : (isNumeric ? toNumberMaybe(raw) : raw);
                                            onChangeImmediate(Object.assign([...where], { [i]: { ...(where[i] as any), value: a } } as any));
                                        }}
                                        onBlur={e => {
                                            const a = Array.isArray((c as any).value) ? [...((c as any).value as any[])] : ['', ''];
                                            a[0] = e.target.value;
                                            patch(i, { value: a } as any, true);
                                        }}
                                    />
                                    <input
                                        placeholder={isNumeric ? 'max или {{key}}' : 'max или {{key}}'}
                                        value={Array.isArray((c as any).value) ? String(((c as any).value as any[])[1] ?? '') : ''}
                                        onChange={e => {
                                            const a = Array.isArray((c as any).value) ? [...((c as any).value as any[])] : ['', ''];
                                            const raw = e.target.value;
                                            a[1] = raw.includes('{{') ? raw : (isNumeric ? toNumberMaybe(raw) : raw);
                                            onChangeImmediate(Object.assign([...where], { [i]: { ...(where[i] as any), value: a } } as any));
                                        }}
                                        onBlur={e => {
                                            const a = Array.isArray((c as any).value) ? [...((c as any).value as any[])] : ['', ''];
                                            a[1] = e.target.value;
                                            patch(i, { value: a } as any, true);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <button type="button" onClick={() => remove(i)} title="Удалить">✕</button>
                    </div>
                );
            })}

            <div><button type="button" onClick={add}>+ Добавить фильтр</button></div>
        </div>
    );
}

export default WhereEditor;
