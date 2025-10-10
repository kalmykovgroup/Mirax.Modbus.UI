// src/features/chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/DevicesPanel/DeviceSortDropdown/DeviceSortDropdown.tsx
import { useCallback, type JSX, type ChangeEvent } from 'react';
import classNames from 'classnames';

import styles from './DeviceSortDropdown.module.css';
import type {
    DeviceSortType,
    DeviceSortOption,
} from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';
import { DEVICE_SORT_OPTIONS } from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';

interface Props {
    readonly value: DeviceSortType;
    readonly onChange: (sortType: DeviceSortType) => void;
    readonly className?: string | undefined;
}

export function DeviceSortDropdown({ value, onChange, className }: Props): JSX.Element {
    const handleChange = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            onChange(event.target.value as DeviceSortType);
        },
        [onChange]
    );

    return (
        <div className={classNames(styles.container, className)}>
            <label htmlFor="device-sort-select" className={styles.label}>
                Сортировка:
            </label>
            <select
                id="device-sort-select"
                className={styles.select}
                value={value}
                onChange={handleChange}
                aria-label="Выбрать тип сортировки устройств"
            >
                {DEVICE_SORT_OPTIONS.map((option: DeviceSortOption) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}