import {useAppDispatch} from "@/baseStore/hooks.ts";
import {useSelector} from "react-redux";
import React from "react";
import type {FilterClause} from "@chartsPage/template/shared/dtos/FilterClause.ts";
import {notify} from "@app/lib/notify.ts";
import {FilterOp} from "@chartsPage/metaData/shared/dtos/types/FilterOp.ts";
import {
    selectActiveTemplate,
    selectFields,
    setActiveTemplateWhere
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";
import {FilterRow} from "@chartsPage/metaData/ui/SqlAndFiltersSection/WhereEditor/FilterRow.tsx";

export function WhereEditor(): React.JSX.Element {
    const dispatch = useAppDispatch();
    const template = useSelector(selectActiveTemplate);
    const fields = useSelector(selectFields) ?? [];

    const where = template.where ?? [];

    const updateWhere = React.useCallback((newWhere: FilterClause[]) => {
        dispatch(setActiveTemplateWhere(newWhere));
    }, [dispatch]);

    const addFilter = React.useCallback(() => {
        if (fields.length === 0) {
            notify.show('Нет полей для выбора');
            return;
        }
        const newClause: FilterClause = {
            field: fields[0]!,
            op: FilterOp.Eq,
            value: ''
        };
        updateWhere([...where, newClause]);
    }, [fields, where, updateWhere]);

    const updateFilter = React.useCallback((index: number, updates: Partial<FilterClause>) => {
        const newWhere = [...where];
        newWhere[index] = { ...newWhere[index], ...updates } as FilterClause;
        updateWhere(newWhere);
    }, [where, updateWhere]);

    const removeFilter = React.useCallback((index: number) => {
        const newWhere = where.filter((_, i) => i !== index);
        updateWhere(newWhere);
    }, [where, updateWhere]);

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Фильтры (WHERE)</div>

            {where.map((clause, index) => (
                <FilterRow
                    key={index}
                    clause={clause}
                    availableFields={fields}
                    onUpdate={(updates) => updateFilter(index, updates)}
                    onRemove={() => removeFilter(index)}
                />
            ))}

            <div>
                <button type="button" onClick={addFilter}>
                    + Добавить фильтр
                </button>
            </div>
        </div>
    );
}