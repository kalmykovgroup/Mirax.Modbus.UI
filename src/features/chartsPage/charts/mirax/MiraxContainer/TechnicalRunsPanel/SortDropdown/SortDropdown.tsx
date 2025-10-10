// src/features/chartsPage/charts/mirax/MiraxContainer/TechnicalRunsPanel/SortDropdown/SortDropdown.tsx
import { useCallback, type JSX, type ChangeEvent } from 'react';
import classNames from 'classnames';

import styles from './SortDropdown.module.css';
import type {
    TechnicalRunSortType,
    TechnicalRunSortOption,
} from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';
import { TECHNICAL_RUN_SORT_OPTIONS } from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';

interface Props {
    readonly value: TechnicalRunSortType;
    readonly onChange: (sortType: TechnicalRunSortType) => void;
    readonly className?: string | undefined;
}

export function SortDropdown({ value, onChange, className }: Props): JSX.Element {
    const handleChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            onChange(event.target.value as TechnicalRunSortType);
        },
        [onChange]
    );

    return (
        <div className={classNames(styles.container, className)}>
            <label htmlFor="sort-select" className={styles.label}>
                Сортировка:
            </label>
            <select
                id="sort-select"
                className={styles.select}
                value={value}
                onChange={handleChange}
                aria-label="Выбрать тип сортировки"
            >
                {TECHNICAL_RUN_SORT_OPTIONS.map((option: TechnicalRunSortOption) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}