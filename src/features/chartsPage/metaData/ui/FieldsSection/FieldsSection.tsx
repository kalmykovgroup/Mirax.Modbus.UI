import React from "react";
import { useSelector } from "react-redux";

import { useAppDispatch } from "@/store/hooks.ts";
import { selectChartsMetaLoading, selectErrors } from "@chartsPage/metaData/store/chartsMetaSlice.ts";
import {
    selectFields,
    selectSelectedFields,
    setActiveTemplateSelectedFields,
    toggleActiveTemplateSelectedField
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";
import type { FieldDto } from "@chartsPage/metaData/shared/dtos/FieldDto.ts";

export function FieldsSection(): React.JSX.Element {
    const dispatch = useAppDispatch();

    const fields = useSelector(selectFields) ?? [];
    const loading = useSelector(selectChartsMetaLoading).fields;
    const error = useSelector(selectErrors).fields;
    const selectedFields = useSelector(selectSelectedFields);

    const selectedKeys = React.useMemo(
        () => new Set((selectedFields ?? []).map(f => f.name)),
        [selectedFields]
    );

    const handleToggle = React.useCallback((field: FieldDto) => {
        dispatch(toggleActiveTemplateSelectedField(field));
    }, [dispatch]);

    const handleSelectNumeric = React.useCallback(() => {
        dispatch(setActiveTemplateSelectedFields(fields.filter(f => f.isNumeric)));
    }, [dispatch, fields]);

    const handleClear = React.useCallback(() => {
        dispatch(setActiveTemplateSelectedFields([]));
    }, [dispatch]);

    return (
        <section style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 12, opacity: 0.85 }}>
                    Поля (выбранные — строим/фильтруем)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleSelectNumeric}
                        disabled={loading || fields.length === 0}
                    >
                        Только numeric
                    </button>
                    <button
                        onClick={handleClear}
                        disabled={loading || fields.length === 0}
                    >
                        Очистить
                    </button>
                </div>
            </div>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                padding: 8,
                border: '1px solid #333',
                borderRadius: 6,
                minHeight: 44
            }}>
                {loading && (
                    <span style={{ fontSize: 12, opacity: 0.7 }}>загрузка…</span>
                )}
                {!loading && fields.length === 0 && (
                    <span style={{ fontSize: 12, opacity: 0.7 }}>нет полей</span>
                )}
                {!loading && fields.map(f => {
                    const checked = selectedKeys.has(f.name);
                    return (
                        <label
                            key={f.name}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '2px 6px',
                                border: '1px solid #444',
                                borderRadius: 6,
                                fontSize: 12,
                                cursor: 'pointer'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggle(f)}
                            />
                            <span>{f.name}</span>
                            <span style={{ opacity: 0.6 }}>
                                {f.isTime ? ' ⏱' : f.isNumeric ? ' #️⃣' : ''}
                            </span>
                        </label>
                    );
                })}
            </div>

            {error && <small style={{ color: 'tomato' }}>{error}</small>}
        </section>
    );
}