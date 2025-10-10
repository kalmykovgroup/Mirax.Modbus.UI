// src/features/chartsPage/charts/mirax/MiraxContainer/DevicesPanel/DevicesPanel.tsx
import { useState, useMemo, useCallback, useEffect, type JSX } from 'react';

import styles from './DevicesPanel.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks.ts';
import {
    selectDatabaseId,
    selectDevicesLoading,
    selectIsDevicesLoading,
    selectDevicesError,
} from '@chartsPage/charts/mirax/miraxSlice.ts';
import { useGetPortableDevicesQuery } from '@chartsPage/charts/mirax/miraxApi.ts';
import { fetchPortableDevices } from '@chartsPage/charts/mirax/miraxThunks.ts';
import { DeviceSortDropdown } from '@chartsPage/charts/mirax/MiraxContainer/DevicesPanel/DeviceSortDropdown/DeviceSortDropdown.tsx';
import { ComPortsFilter } from '@chartsPage/charts/mirax/MiraxContainer/DevicesPanel/ComPortsFilter/ComPortsFilter.tsx';
import { PortableDevicesList } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDevicesList.tsx';
import { ErrorMessage } from '@chartsPage/charts/mirax/MiraxContainer/ErrorMessage/ErrorMessage.tsx';
import { LoadingProgress } from '@chartsPage/charts/mirax/MiraxContainer/LoadingProgress/LoadingProgress.tsx';
import type { Guid } from '@app/lib/types/Guid.ts';
import {
    sortDevices,
    DeviceSortType,
    type DeviceSortType as DeviceSortTypeValue,
} from '@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers.ts';
import { SearchInput } from '@chartsPage/charts/mirax/MiraxContainer/SearchInput/SearchInput.tsx';

interface Props {
    readonly technicalRunId: Guid;
}

export function DevicesPanel({ technicalRunId }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const loadingState = useAppSelector((state) => selectDevicesLoading(state, technicalRunId));
    const isLoading = useAppSelector((state) => selectIsDevicesLoading(state, technicalRunId));
    const error = useAppSelector((state) => selectDevicesError(state, technicalRunId));

    const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
    const [selectedPort, setSelectedPort] = useState<string | null>(null);
    const [sortType, setSortType] = useState<DeviceSortTypeValue>(
        DeviceSortType.FACTORY_NUMBER_ASC
    );

    // Читаем данные из RTK Query кеша
    const { data: devices = [] } = useGetPortableDevicesQuery(
        {
            dbId: databaseId!,
            body: { technicalRunId },
        },
        {
            skip: databaseId === undefined,
        }
    );

    // Загрузка устройств при монтировании (через thunk)
    useEffect(() => {
        if (databaseId !== undefined && devices.length === 0 && !isLoading && error === undefined) {
            dispatch(fetchPortableDevices({ databaseId, technicalRunId }));
        }
    }, [dispatch, databaseId, technicalRunId, devices.length, isLoading, error]);

    const filteredAndSortedDevices = useMemo(() => {
        let result = devices;

        // Фильтрация по COM-порту
        if (selectedPort !== null) {
            result = result.filter((device) => {
                const portName = device.comPortName;
                return portName != null && portName === selectedPort;
            });
        }

        // Фильтрация по поисковому запросу
        if (deviceSearchQuery.trim()) {
            const query = deviceSearchQuery.toLowerCase().trim();

            result = result.filter((device) => {
                const nameMatch = device.name?.toLowerCase().includes(query);
                const factoryNumberMatch = device.factoryNumber?.toLowerCase().includes(query);

                return nameMatch || factoryNumberMatch;
            });
        }

        // Сортировка
        return sortDevices(result, sortType);
    }, [devices, selectedPort, deviceSearchQuery, sortType]);

    const handleDeviceSearchChange = useCallback((value: string) => {
        setDeviceSearchQuery(value);
    }, []);

    const handleDeviceSearchClear = useCallback(() => {
        setDeviceSearchQuery('');
    }, []);

    const handlePortChange = useCallback((port: string | null) => {
        setSelectedPort(port);
    }, []);

    const handleSortChange = useCallback((newSortType: DeviceSortTypeValue) => {
        setSortType(newSortType);
    }, []);

    const handleRetry = useCallback(() => {
        if (databaseId !== undefined) {
            dispatch(fetchPortableDevices({ databaseId, technicalRunId }));
        }
    }, [dispatch, databaseId, technicalRunId]);

    const showNoResults =
        (deviceSearchQuery.trim() || selectedPort !== null) &&
        filteredAndSortedDevices.length === 0;

    // Ошибка загрузки
    if (error !== undefined) {
        return (
            <div className={styles.container}>
                <ErrorMessage message={error} onRetry={handleRetry} />
            </div>
        );
    }

    // Загрузка
    if (isLoading) {
        return (
            <div className={styles.container}>
                <LoadingProgress
                    progress={loadingState.progress}
                    message="Загрузка устройств..."
                />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Устройства</h2>
                {devices.length > 0 && (
                    <span className={styles.count}>
                        {deviceSearchQuery.trim() || selectedPort !== null
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

            {/* Фильтр по COM-портам */}
            <ComPortsFilter
                devices={devices}
                selectedPort={selectedPort}
                onPortChange={handlePortChange}
            />

            <div className={styles.list}>
                {devices.length === 0 ? (
                    <div className={styles.placeholder}>Нет устройств</div>
                ) : showNoResults ? (
                    <div className={styles.placeholder}>
                        {selectedPort !== null && !deviceSearchQuery.trim()
                            ? `Нет устройств на порту ${selectedPort}`
                            : `Ничего не найдено по запросу "${deviceSearchQuery}"`}
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