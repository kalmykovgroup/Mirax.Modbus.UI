// src/features/chartsPage/charts/mirax/MiraxContainer/TechnicalRunsPanel/FactoryNumberSearch/FactoryNumberSearch.tsx
import { useCallback, useState, type JSX, type ChangeEvent, type KeyboardEvent } from 'react';
import classNames from 'classnames';

import styles from './FactoryNumberSearch.module.css';

interface Props {
    readonly onSearch: (factoryNumber: string) => void;
    readonly onClear: () => void;
    readonly isActive: boolean;
    readonly className?: string | undefined;
}

export function FactoryNumberSearch({ onSearch, onClear, isActive, className }: Props): JSX.Element {
    const [value, setValue] = useState('');

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
    }, []);

    const handleSearch = useCallback(() => {
        const trimmed = value.trim();
        if (trimmed) {
            onSearch(trimmed);
        }
    }, [value, onSearch]);

    const handleClear = useCallback(() => {
        setValue('');
        onClear();
    }, [onClear]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
            }
        },
        [handleSearch]
    );

    return (
        <div className={classNames(styles.container, className)}>
            <input
                type="text"
                className={styles.input}
                placeholder="Заводской номер устройства..."
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                aria-label="Поиск по заводскому номеру"
            />
            <button
                type="button"
                className={styles.searchButton}
                onClick={handleSearch}
                disabled={!value.trim()}
                aria-label="Искать испытания"
                title="Искать испытания с этим устройством"
            >
                🔍 Искать
            </button>
            {isActive && (
                <button
                    type="button"
                    className={styles.clearButton}
                    onClick={handleClear}
                    aria-label="Показать все испытания"
                    title="Сбросить фильтр и показать все испытания"
                >
                    ✕ Сбросить
                </button>
            )}
        </div>
    );
}