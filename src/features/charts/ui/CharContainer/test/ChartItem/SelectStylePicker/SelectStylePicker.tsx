import React from 'react';
import styles from './SelectStylePicker.module.css';
import type {StylePreset} from "@charts/ui/CharContainer/ChartCollection/ChartItem/lib/theme.ts";

type Props = {
    value: string;                           // styleId
    onChange: (nextId: string) => void;
    options: readonly StylePreset[];
    label?: string | undefined;
    disabled?: boolean | undefined;
    className?: string | undefined;
};

const SelectStylePicker: React.FC<Props> = ({
                                                value,
                                                onChange,
                                                options,
                                                label = 'Стиль',
                                                disabled,
                                                className,
                                            }) => {
    return (
        <label className={`${styles.wrapper} ${className ?? ''}`}>
            <div className={styles.label}>{label}</div>

            <div className={styles.control}>
                <select
                    className={styles.select}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    aria-label={label}
                >
                    {options.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>

                <svg className={styles.chevron} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path d="M5.5 7.5l4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            </div>
        </label>
    );
};

export default SelectStylePicker;
