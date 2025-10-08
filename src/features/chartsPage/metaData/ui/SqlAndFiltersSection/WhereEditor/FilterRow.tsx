import * as React from "react";
import type {FilterClause} from "@chartsPage/template/shared/dtos/FilterClause.ts";
import {FilterOp} from "@chartsPage/metaData/shared/dtos/types/FilterOp.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import {SingleValueEditor} from "@chartsPage/metaData/ui/SqlAndFiltersSection/WhereEditor/SingleValueEditor.tsx";
import {ArrayValueEditor} from "@chartsPage/metaData/ui/SqlAndFiltersSection/WhereEditor/ArrayValueEditor.tsx";
import {BetweenValueEditor} from "@chartsPage/metaData/ui/SqlAndFiltersSection/WhereEditor/BetweenValueEditor.tsx";

type ValueKind = 'none' | 'single' | 'array' | 'between';

const OPERATORS: Array<{ op: FilterOp; label: string; kind: ValueKind }> = [
    { op: FilterOp.Eq, label: '=', kind: 'single' },
    { op: FilterOp.Ne, label: '≠', kind: 'single' },
    { op: FilterOp.Gt, label: '>', kind: 'single' },
    { op: FilterOp.Gte, label: '≥', kind: 'single' },
    { op: FilterOp.Lt, label: '<', kind: 'single' },
    { op: FilterOp.Lte, label: '≤', kind: 'single' },
    { op: FilterOp.Between, label: 'between', kind: 'between' },
    { op: FilterOp.In, label: 'in', kind: 'array' },
    { op: FilterOp.Nin, label: 'not in', kind: 'array' },
    { op: FilterOp.Like, label: 'like', kind: 'single' },
    { op: FilterOp.ILike, label: 'ilike', kind: 'single' },
    { op: FilterOp.IsNull, label: 'is null', kind: 'none' },
    { op: FilterOp.NotNull, label: 'not null', kind: 'none' },
];

/** Компонент для одной строки фильтра */
export function FilterRow({
                       clause,
                       availableFields,
                       onUpdate,
                       onRemove
                   }: {
    clause: FilterClause;
    availableFields: FieldDto[];
    onUpdate: (updates: Partial<FilterClause>) => void;
    onRemove: () => void;
}): React.JSX.Element {
    const field = availableFields.find(f => f.name === clause.field.name);
    const isNumeric = field?.isNumeric;

    const opDef = OPERATORS.find(o => o.op === clause.op) ?? OPERATORS[0]!;
    const kind = opDef.kind;

    const handleFieldChange = (fieldName: string) => {
        const newField = availableFields.find(f => f.name === fieldName);
        if (newField) {
            onUpdate({ field: newField });
        }
    };

    const handleOpChange = (newOp: FilterOp) => {
        const newOpDef = OPERATORS.find(o => o.op === newOp) ?? OPERATORS[0]!;
        let newValue: unknown = clause.value;

        // Адаптируем значение под новый тип оператора
        if (newOpDef.kind === 'none') {
            newValue = undefined;
        } else if (newOpDef.kind === 'single' && Array.isArray(newValue)) {
            newValue = '';
        } else if (newOpDef.kind === 'array' && !Array.isArray(newValue)) {
            newValue = [];
        } else if (newOpDef.kind === 'between') {
            newValue = Array.isArray(newValue) && newValue.length === 2 ? newValue : ['', ''];
        }

        onUpdate({ op: newOp, value: newValue });
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 1fr auto',
            gap: 8,
            alignItems: 'center'
        }}>
            {/* Поле */}
            <select value={clause.field.name} onChange={e => handleFieldChange(e.target.value)}>
                {availableFields.map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                ))}
            </select>

            {/* Оператор */}
            <select value={clause.op} onChange={e => handleOpChange(e.target.value as FilterOp)}>
                {OPERATORS.map(o => (
                    <option key={o.op} value={o.op}>{o.label}</option>
                ))}
            </select>

            {/* Значение */}
            <div>
                {kind === 'none' && (
                    <i style={{ opacity: 0.7 }}>—</i>
                )}

                {kind === 'single' && (
                    <SingleValueEditor
                        value={clause.value}
                        isNumeric={isNumeric}
                        onChange={v => onUpdate({ value: v })}
                    />
                )}

                {kind === 'array' && (
                    <ArrayValueEditor
                        value={clause.value}
                        isNumeric={isNumeric}
                        onChange={v => onUpdate({ value: v })}
                    />
                )}

                {kind === 'between' && (
                    <BetweenValueEditor
                        value={clause.value}
                        isNumeric={isNumeric}
                        onChange={v => onUpdate({ value: v })}
                    />
                )}
            </div>

            {/* Удалить */}
            <button type="button" onClick={onRemove} title="Удалить">
                ✕
            </button>
        </div>
    );
}
