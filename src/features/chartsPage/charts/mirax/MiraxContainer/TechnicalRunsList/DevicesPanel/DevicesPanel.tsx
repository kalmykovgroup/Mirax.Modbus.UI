// src/features/chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/DevicesPanel/DevicesPanel.tsx
import { useState, useMemo, useCallback, type JSX } from 'react';

import styles from './DevicesPanel.module.css';
import { useAppSelector } from '@/store/hooks';
import { selectDatabaseId } from '@chartsPage/charts/mirax/miraxSlice';
import { useGetPortableDevicesQuery } from '@chartsPage/charts/mirax/miraxApi';
import { DeviceSortDropdown } from '@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/DevicesPanel/DeviceSortDropdown/DeviceSortDropdown';
import { PortableDevicesList } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDevicesList';
import type { Guid } from '@app/lib/types/Guid';
import {
    sortDevices,
    DeviceSortType,
    type DeviceSortType as DeviceSortTypeValue,
} from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers';
import {SearchInput} from "@chartsPage/charts/mirax/MiraxContainer/SearchInput/SearchInput.tsx";

interface Props {
    readonly technicalRunId: Guid;
}

export function DevicesPanel({ technicalRunId }: Props): JSX.Element {
    const databaseId = useAppSelector(selectDatabaseId);
    const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
    const [sortType, setSortType] = useState<DeviceSortTypeValue>(
        DeviceSortType.FACTORY_NUMBER_ASC
    );

    const { data: devices = [], isLoading } = useGetPortableDevicesQuery(
        {
            dbId: databaseId!,
            body: { technicalRunId },
        },
        {
            skip: databaseId === undefined,
        }
    );

    const filteredAndSortedDevices = useMemo(() => {
        let result = devices;

        // Фильтрация по поисковому запросу
        if (deviceSearchQuery.trim()) {
            const query = deviceSearchQuery.toLowerCase().trim();

            result = devices.filter((device) => {
                const nameMatch = device.name?.toLowerCase().includes(query);
                const factoryNumberMatch = device.factoryNumber?.toLowerCase().includes(query);

                return nameMatch || factoryNumberMatch;
            });
        }

        // Сортировка
        return sortDevices(result, sortType);
    }, [devices, deviceSearchQuery, sortType]);

    const handleDeviceSearchChange = useCallback((value: string) => {
        setDeviceSearchQuery(value);
    }, []);

    const handleDeviceSearchClear = useCallback(() => {
        setDeviceSearchQuery('');
    }, []);

    const handleSortChange = useCallback((newSortType: DeviceSortTypeValue) => {
        setSortType(newSortType);
    }, []);

    const showNoResults = deviceSearchQuery.trim() && filteredAndSortedDevices.length === 0;

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Загрузка устройств...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Устройства</h2>
                {devices.length > 0 && (
                    <span className={styles.count}>
                        {deviceSearchQuery.trim()
                            ? `${filteredAndSortedDevices.length} из ${devices.length}`
                            : devices.length}
                    </span>
                )}
            </div>

            {devices.length > 0 && (
                <div className={styles.controls}>
                    <SearchInput
                        value={deviceSearchQuery}
                        onChange={handleDeviceSearchChange}
                        onClear={handleDeviceSearchClear}
                        placeholder="Поиск устройства..."
                    />
                    <DeviceSortDropdown value={sortType} onChange={handleSortChange} />
                </div>
            )}

            <div className={styles.list}>
                {devices.length === 0 ? (
                    <div className={styles.placeholder}>Нет устройств</div>
                ) : showNoResults ? (
                    <div className={styles.placeholder}>
                        Ничего не найдено по запросу "{deviceSearchQuery}"
                    </div>
                ) : (
                    <PortableDevicesList
                        devices={filteredAndSortedDevices}
                        technicalRunId={technicalRunId}
                    />
                )}
            </div>
        </div>
    );
}