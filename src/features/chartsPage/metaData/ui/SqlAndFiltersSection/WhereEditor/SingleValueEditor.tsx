import React from "react";




/** Редактор для single значения (с режимами value/key) */
export function SingleValueEditor({
                               value,
                               isNumeric,
                               onChange
                           }: {
    value: unknown;
    isNumeric?: boolean | undefined;
    onChange: (value: string) => void;
}): React.JSX.Element {
    const strValue = String(value || '');

    // Определяем режим: если значение начинается с {{ и заканчивается }}, это ключ
    const isKeyMode = /^{{.*}}$/.test(strValue);

    // Локальный state для ключа (без скобок)
    const [localKey, setLocalKey] = React.useState(() => {
        if (isKeyMode) {
            const match = strValue.match(/^{{\s*(.*?)\s*}}$/);
            return match ? match[1] || '' : '';
        }
        return '';
    });

    // Синхронизируем localKey при изменении value извне
    React.useEffect(() => {
        if (isKeyMode) {
            const match = strValue.match(/^{{\s*(.*?)\s*}}$/);
            setLocalKey(match ? match[1] || '' : '');
        }
    }, [strValue, isKeyMode]);

    const handleModeChange = (mode: 'value' | 'key') => {
        if (mode === 'key') {
            // Переключаемся на ключ
            setLocalKey('');
            onChange('{{}}');
        } else {
            // Переключаемся на значение
            setLocalKey('');
            onChange('');
        }
    };

    const handleKeyChange = (k: string) => {
        setLocalKey(k);
        onChange(`{{${k}}}`);
    };

    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
                value={isKeyMode ? 'key' : 'value'}
                onChange={e => handleModeChange(e.target.value as 'value' | 'key')}
            >
                <option value="value">значение</option>
                <option value="key">ключ</option>
            </select>

            {isKeyMode ? (
                <input
                    type="text"
                    placeholder="введите ключ"
                    value={localKey}
                    onChange={e => handleKeyChange(e.target.value)}
                />
            ) : (
                <input
                    type="text"
                    placeholder={isNumeric ? 'число' : 'значение'}
                    value={strValue}
                    onChange={e => onChange(e.target.value)}
                />
            )}
        </div>
    );
}