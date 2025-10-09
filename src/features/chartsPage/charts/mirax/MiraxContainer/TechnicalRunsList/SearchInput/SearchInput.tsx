// src/features/mirax/components/SearchInput.tsx
import React, {type JSX, useCallback} from 'react';
import styles from './SearchInput.module.css';

interface Props {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly onClear: () => void;
    readonly placeholder?: string | undefined;
}

export function SearchInput({ value, onChange, onClear, placeholder }: Props): JSX.Element {
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
        },
        [onChange]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Escape' && value) {
                onClear();
            }
        },
        [value, onClear]
    );

    return (
        <div className={styles.container}>
            <input
                type="text"
                className={styles.input}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder ?? 'Поиск...'}
                aria-label="Поиск"
            />

            {value && (
                <button
                    className={styles.clearButton}
                    onClick={onClear}
                    aria-label="Очистить поиск"
                    type="button"
                >
                    ×
                </button>
            )}

            <span className={styles.icon} aria-hidden="true">
        🔍
      </span>
        </div>
    );
}