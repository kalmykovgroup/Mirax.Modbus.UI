import type {SqlParam} from "@chartsPage/template/shared/dtos/SqlParam.ts";
import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";
import React from "react";

import {DefaultValueEditor} from "@chartsPage/metaData/ui/SqlAndFiltersSection/ParamsEditor/DefaultValueEditor.tsx";
import {SqlParamType} from "@chartsPage/template/shared/dtos/SqlParamType.ts";

const TYPE_OPTIONS = [
    SqlParamType.Text,
    SqlParamType.Int,
    SqlParamType.Bigint,
    SqlParamType.Double,
    SqlParamType.Bool,
    SqlParamType.Date,
    SqlParamType.Timestamp,
    SqlParamType.Timestamptz,
    SqlParamType.Uuid,
] as const;


/** Компонент для одной строки параметра */
export function ParamRow({
                      param,
                      availableFields,
                      onUpdate,
                      onRemove
                  }: {
    param: SqlParam;
    availableFields: FieldDto[];
    onUpdate: (updates: Partial<SqlParam>) => void;
    onRemove: () => void;
}): React.JSX.Element {
    const fieldName = param.field?.name ?? '';
    const effectiveType = param.type ?? param.field?.sqlParamType;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.5fr 1fr 140px 100px 1fr auto',
            gap: 8,
            alignItems: 'center',
            padding: '4px',
            borderRadius: '4px',
            border: '1px solid #ddd'
        }}>
            {/* Key */}
            <input
                type="text"
                placeholder="key"
                value={param.key ?? ''}
                onChange={e => onUpdate({ key: e.target.value })}
            />

            {/* Description */}
            <input
                type="text"
                placeholder="описание"
                value={param.description ?? ''}
                onChange={e => onUpdate({ description: e.target.value })}
            />

            {/* Field */}
            <select
                value={fieldName}
                onChange={e => {
                    const field = e.target.value
                        ? availableFields.find(f => f.name === e.target.value)
                        : undefined;
                    onUpdate({ field });
                }}
            >
                <option value="">— поле —</option>
                {availableFields.map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                ))}
            </select>

            {/* Type */}
            <select
                value={param.type ?? ''}
                onChange={e => {
                    const type = e.target.value ? (e.target.value as SqlParamType) : undefined;
                    onUpdate({ type });
                }}
            >
                <option value="">auto</option>
                {TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>

            {/* Required */}
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={!!param.required}
                    onChange={e => onUpdate({ required: e.target.checked })}
                />
                <span style={{ fontSize: 13 }}>required</span>
            </label>

            {/* Default Value */}
            <DefaultValueEditor
                value={param.defaultValue}
                type={effectiveType}
                onChange={v => onUpdate({ defaultValue: v })}
            />

            {/* Remove */}
            <button
                type="button"
                onClick={onRemove}
                title="Удалить параметр"
                style={{ cursor: 'pointer' }}
            >
                ✕
            </button>
        </div>
    );
}