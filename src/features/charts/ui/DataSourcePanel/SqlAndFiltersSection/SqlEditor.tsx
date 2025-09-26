import type { SqlFilter } from '@charts/shared/contracts/chartTemplate/Dtos/SqlFilter.ts';

type Props = {
    sql: SqlFilter | undefined;
    onChangeImmediate: (next: SqlFilter | undefined) => void; // on typing
    onCommit: (next: SqlFilter | undefined) => void;           // on blur
};

export function SqlEditor({ sql, onChangeImmediate, onCommit }: Props) {
    const setSqlText = (text: string, commit: boolean) => {
        const trimmed = (text || '').trim();
        const next = trimmed.length ? { whereSql: trimmed } : undefined;
        if (commit) onCommit(next);
        else onChangeImmediate(next);
    };

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Пользовательский SQL (WHERE)</div>
            <textarea
                rows={4}
                placeholder="пример: BatteryVoltage BETWEEN {{min}} AND {{max}} AND FactoryNumber = {{deviceId}}"
                value={sql?.whereSql ?? ''}
                onChange={e => setSqlText(e.target.value, false)}
                onBlur={e => setSqlText(e.target.value, true)}
            />
            <div style={{ fontSize: 12, opacity: .8 }}>
                Плейсхолдеры <code>{'{{key}}'}</code> добавят параметры при завершении ввода.
            </div>
        </div>
    );
}

export default SqlEditor;
