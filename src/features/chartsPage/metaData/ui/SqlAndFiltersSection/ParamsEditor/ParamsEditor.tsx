import * as React from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from "@/baseStore/hooks.ts";
import type { SqlParam } from "@chartsPage/template/shared/dtos/SqlParam.ts";
import {
    selectActiveTemplate,
    selectFields,
    setActiveTemplateParams
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";
import {ParamRow} from "@chartsPage/metaData/ui/SqlAndFiltersSection/ParamsEditor/ParamRow.tsx";



export function ParamsEditor(): React.JSX.Element {
    const dispatch = useAppDispatch();
    const template = useSelector(selectActiveTemplate);
    const fields = useSelector(selectFields) ?? [];

    const params = template.params ?? [];

    const updateParams = React.useCallback((newParams: SqlParam[]) => {
        dispatch(setActiveTemplateParams(newParams));
    }, [dispatch]);

    const addParam = React.useCallback(() => {
        const newParam: SqlParam = {
            key: '',
            description: '',
            value: undefined,
            defaultValue: undefined,
            field: undefined,
            type: undefined,
            required: false
        };
        updateParams([...params, newParam]);
    }, [params, updateParams]);

    const updateParam = React.useCallback((index: number, updates: Partial<SqlParam>) => {
        const newParams = [...params];
        newParams[index] = { ...newParams[index], ...updates } as SqlParam;
        updateParams(newParams);
    }, [params, updateParams]);

    const removeParam = React.useCallback((index: number) => {
        const newParams = params.filter((_, i) => i !== index);
        updateParams(newParams);
    }, [params, updateParams]);

    // Проверка на дубликаты ключей
    const keys = params.map(p => (p.key || '').trim()).filter(Boolean);
    const hasDuplicates = new Set(keys).size !== keys.length;

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Параметры (Params)</div>

            {hasDuplicates && (
                <div style={{ color: 'orange', fontSize: 13 }}>
                    ⚠️ Есть дублирующиеся ключи параметров
                </div>
            )}

            {params.map((param, index) => (
                <ParamRow
                    key={index}
                    param={param}
                    availableFields={fields}
                    onUpdate={(updates) => updateParam(index, updates)}
                    onRemove={() => removeParam(index)}
                />
            ))}

            <div>
                <button type="button" onClick={addParam}>
                    + Добавить параметр
                </button>
            </div>
        </div>
    );
}

export default ParamsEditor;