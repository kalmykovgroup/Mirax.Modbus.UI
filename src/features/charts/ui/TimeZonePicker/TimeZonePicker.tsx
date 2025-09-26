import React, { useMemo } from 'react';
import type {TimeSettings} from "@charts/store/chartsSettingsSlice.ts";

type Props = {
    value: TimeSettings;
    onChange: (next: TimeSettings) => void;
    available?: string[] | undefined;
    className?: string | undefined;
    style?: React.CSSProperties | undefined;
    label?: string | undefined;
};

// Приоритетные временные зоны (всегда показываем первыми)
const priorityZones = [
    'UTC',
    'Europe/Helsinki',
    'Europe/Moscow',
    'America/New_York',
    'Asia/Almaty',
    'Asia/Tokyo',
];

const TimeZonePicker: React.FC<Props> = ({
                                             value,
                                             onChange,
                                             available,
                                             className,
                                             style,
                                             label = 'Показывать в часовом поясе',
                                         }) => {
    const browserTz = useMemo(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        []
    );

    const zones = useMemo(() => {
        // Базовый список зон
        let baseZones: string[] = [];

        if (available && available.length > 0) {
            baseZones = [...available];
        } else {
            // Пытаемся получить все зоны из браузера
            try {
                if (typeof Intl.supportedValuesOf === 'function') {
                    baseZones = Intl.supportedValuesOf('timeZone');
                }
            } catch (e) {
                console.warn('Intl.supportedValuesOf not supported');
            }

            // Если не удалось получить зоны, используем fallback
            if (baseZones.length === 0) {
                baseZones = [...priorityZones];
            }
        }

        // ВАЖНО: Гарантируем наличие UTC в списке
        const zonesSet = new Set(baseZones);

        // Добавляем UTC если его нет
        if (!zonesSet.has('UTC')) {
            zonesSet.add('UTC');
        }

        // Добавляем зону браузера если её нет
        if (browserTz && !zonesSet.has(browserTz)) {
            zonesSet.add(browserTz);
        }

        // Преобразуем обратно в массив
        const allZones = Array.from(zonesSet);

        // Сортируем: UTC первый, затем остальные приоритетные, затем все остальные
        const result: string[] = [];

        // UTC всегда первый
        result.push('UTC');

        // Затем остальные приоритетные зоны (если есть в списке)
        for (const zone of priorityZones) {
            if (zone !== 'UTC' && allZones.includes(zone)) {
                result.push(zone);
            }
        }

        // Затем все остальные зоны в алфавитном порядке
        const otherZones = allZones
            .filter(z => !result.includes(z))
            .sort();

        result.push(...otherZones);

        return result;
    }, [available, browserTz]);

    const toggle = () => onChange({ ...value, useTimeZone: !value.useTimeZone });

    const changeTz: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
        onChange({ ...value, timeZone: e.target.value });
    };

    // Форматирование отображения зон
    const formatZoneOption = (zone: string): string => {
        if (zone === 'UTC') {
            return 'UTC (+00:00)';
        }
        if (zone === browserTz) {
            return `${zone} (Ваша зона)`;
        }
        return zone;
    };

    return (
        <div className={className} style={{ display: 'flex', gap: 12, alignItems: 'center', ...(style || {}) }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={value.useTimeZone}
                    onChange={toggle}
                    style={{ cursor: 'pointer' }}
                />
                <span style={{ userSelect: 'none' }}>{label}</span>
            </label>

            <select
                value={value.timeZone}
                onChange={changeTz}
                disabled={!value.useTimeZone}
                aria-label="Часовой пояс"
                style={{
                    minWidth: '250px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #d9d9d9',
                    backgroundColor: value.useTimeZone ? '#fff' : '#f5f5f5',
                    cursor: value.useTimeZone ? 'pointer' : 'not-allowed',
                    color: '#333',
                    fontWeight: value.timeZone === 'UTC' ? '600' : 'normal'
                }}
            >
                {zones.map((zone, index) => {
                    // Разделитель после приоритетных зон
                    const showSeparator = index === priorityZones.length && zones.length > priorityZones.length + 1;

                    return (
                        <React.Fragment key={zone}>
                            <option value={zone}>
                                {formatZoneOption(zone)}
                            </option>
                            {showSeparator && (
                                <option disabled value="">
                                    ──────────────────
                                </option>
                            )}
                        </React.Fragment>
                    );
                })}
            </select>

            <span style={{
                opacity: 0.7,
                fontSize: 12,
                color: '#666'
            }}>
                {value.useTimeZone && value.timeZone === 'UTC'
                    ? '✓ Используется UTC время'
                    : '(в запрос уходит UTC ISO)'
                }
            </span>
        </div>
    );
};

export default TimeZonePicker;