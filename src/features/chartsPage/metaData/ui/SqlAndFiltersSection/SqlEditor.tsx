import * as React from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from "@/baseStore/hooks.ts";
import type { SqlFilter } from "@chartsPage/template/shared/dtos/SqlFilter.ts";
import {
    selectActiveTemplate,
    setActiveTemplateSql
} from "@chartsPage/template/store/chartsTemplatesSlice.ts";

export function SqlEditor(): React.JSX.Element {
    const dispatch = useAppDispatch();
    const template = useSelector(selectActiveTemplate);

    const sql = template.sql;
    const sqlText = sql?.whereSql ?? '';

    const updateSql = React.useCallback((text: string) => {
        const trimmed = text.trim();
        const newSql: SqlFilter | undefined = trimmed ? { whereSql: trimmed } : undefined;
        dispatch(setActiveTemplateSql(newSql));
    }, [dispatch]);

    const handleChange = (text: string) => {
        updateSql(text);
    };

    const handleClear = () => {
        updateSql('');
    };

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontWeight: 600 }}>Пользовательский SQL (WHERE)</div>
                {sqlText && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{ fontSize: 12 }}
                    >
                        Очистить
                    </button>
                )}
            </div>

            <textarea
                rows={6}
                placeholder="Пример: BatteryVoltage BETWEEN 10 AND 50 AND FactoryNumber = 'ABC123'"
                value={sqlText}
                onChange={e => handleChange(e.target.value)}
                style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    padding: 8,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    resize: 'vertical'
                }}
            />

            <div style={{ fontSize: 12, opacity: 0.7 }}>
                <div>💡 Советы:</div>
                <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                    <li>Пишите только условие WHERE без ключевого слова WHERE</li>
                    <li>Можно использовать плейсхолдеры: <code>{'{{paramKey}}'}</code></li>
                    <li>Пример с параметрами: <code>Temperature {'>'} {'{{minTemp}}'} AND Humidity {'<'} {'{{maxHumidity}}'}</code></li>
                </ul>
            </div>

            {sqlText && (
                <div style={{
                    padding: 8,
                    background: '#f5f5f5',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'monospace'
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Итоговый SQL:</div>
                    <div style={{ color: '#666' }}>
                        SELECT * FROM table WHERE <span style={{ color: '#0066cc' }}>{sqlText}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SqlEditor;