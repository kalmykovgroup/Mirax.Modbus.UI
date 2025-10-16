// src/features/chartsPage/charts/mirax/MiraxContainer/DevicesPanel/DevicesPanel.tsx
import { useState, useMemo, useCallback, useEffect, type JSX } from 'react';

import styles from './DevicesPanel.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    selectCurrentDatabase,
    selectDevicesLoading,
    selectIsDevicesLoading,
    selectDevicesError,
    selectTechnicalRunById,
    selectDevicesByTechnicalRunId,
    selectDefaultBaseTemplateId,
    selectDefaultSensorTemplateId, selectActiveFactoryNumber,
} from '@chartsPage/mirax/miraxSlice';
import { fetchPortableDevices } from '@chartsPage/mirax/miraxThunks';
import { DeviceSortDropdown } from '@chartsPage/mirax/MiraxContainer/DevicesPanel/DeviceSortDropdown/DeviceSortDropdown';
import { ComPortsFilter } from '@chartsPage/mirax/MiraxContainer/DevicesPanel/ComPortsFilter/ComPortsFilter';
import { PortableDevicesList } from '@chartsPage/mirax/MiraxContainer/PortableDevicesList/PortableDevicesList';
import { ErrorMessage } from '@chartsPage/mirax/MiraxContainer/ErrorMessage/ErrorMessage';
import { LoadingProgress } from '@chartsPage/mirax/MiraxContainer/LoadingProgress/LoadingProgress';
import type { Guid } from '@app/lib/types/Guid';
import {
    sortDevices,
    DeviceSortType,
    type DeviceSortType as DeviceSortTypeValue,
} from '@chartsPage/mirax/MiraxContainer/utils/miraxHelpers';
import { SearchInput } from '@chartsPage/mirax/MiraxContainer/SearchInput/SearchInput';
import type { DatabaseDto } from '@chartsPage/metaData/shared/dtos/DatabaseDto';

interface Props {
    readonly technicalRunId: Guid;
}

export function DevicesPanel({ technicalRunId }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const database: DatabaseDto | undefined = useAppSelector(selectCurrentDatabase);
    const loadingState = useAppSelector((state) => selectDevicesLoading(state, technicalRunId));
    const isLoading = useAppSelector((state) => selectIsDevicesLoading(state, technicalRunId));
    const error = useAppSelector((state) => selectDevicesError(state, technicalRunId));

    const technicalRun = useAppSelector((state) => selectTechnicalRunById(state, technicalRunId));
    const devices = useAppSelector((state) => selectDevicesByTechnicalRunId(state, technicalRunId));

    const allTemplates = useAppSelector((state) => state.chartsTemplates.items);
    const defaultBaseTemplateId = useAppSelector(selectDefaultBaseTemplateId);
    const defaultSensorTemplateId = useAppSelector(selectDefaultSensorTemplateId);

    const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
    const [selectedPort, setSelectedPort] = useState<string | undefined>(undefined);
    const [sortType, setSortType] = useState<DeviceSortTypeValue>(
        DeviceSortType.FACTORY_NUMBER_ASC
    );

    const activeFactoryNumber = useAppSelector(selectActiveFactoryNumber);

    useEffect(() => {
        if (database?.id !== undefined && devices.length === 0 && !isLoading && error === undefined) {
            void dispatch(fetchPortableDevices({ databaseId: database.id, technicalRunId }));
        }
    }, [dispatch, database, technicalRunId, devices.length, isLoading, error]);

    const filteredAndSortedDevices = useMemo(() => {
        let result = devices;

        // Фильтрация по COM-порту
        if (selectedPort !== undefined) {
            result = result.filter((device) => {
                if (!('comPortName' in device)) {
                    return false;
                }
                const portName = device.comPortName;
                // ИСПРАВЛЕНО: проверка на строку вместо !== undefined
                return typeof portName === 'string' && portName.trim() === selectedPort;
            });
        }

        // Фильтрация по поисковому запросу
        if (deviceSearchQuery.trim()) {
            const query = deviceSearchQuery.toLowerCase().trim();

            result = result.filter((device) => {
                // ИСПРАВЛЕНО: проверка на строку вместо !== undefined и null
                const nameMatch = ('name' in device && typeof device.name === 'string')
                    ? device.name.toLowerCase().includes(query)
                    : false;

                const factoryNumberMatch = ('factoryNumber' in device && typeof device.factoryNumber === 'string')
                    ? device.factoryNumber.toLowerCase().includes(query)
                    : false;

                return nameMatch || factoryNumberMatch;
            });
        }

        return sortDevices(result, sortType);
    }, [devices, selectedPort, deviceSearchQuery, sortType]);

    const handleDeviceSearchChange = useCallback((value: string) => {
        setDeviceSearchQuery(value);
    }, []);

    const handleDeviceSearchClear = useCallback(() => {
        setDeviceSearchQuery('');
    }, []);

    const handlePortChange = useCallback((port: string | undefined) => {
        setSelectedPort(port);
    }, []);

    const handleSortChange = useCallback((newSortType: DeviceSortTypeValue) => {
        setSortType(newSortType);
    }, []);

    const handleRetry = useCallback(() => {
        if (database?.id !== undefined) {
            void dispatch(fetchPortableDevices({ databaseId: database.id, technicalRunId }));
        }
    }, [dispatch, database, technicalRunId]);

    const showNoResults =
        (deviceSearchQuery.trim() || selectedPort !== undefined) &&
        filteredAndSortedDevices.length === 0;

    if (technicalRun === undefined) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Ошибка: данные испытания не найдены</div>
            </div>
        );
    }

    if (error !== undefined) {
        return (
            <div className={styles.container}>
                <ErrorMessage message={error} onRetry={handleRetry} />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={styles.container}>
                <LoadingProgress progress={loadingState.progress} message="Загрузка устройств..." />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Устройства</h2>
                {devices.length > 0 && (
                    <span className={styles.count}>
                        {deviceSearchQuery.trim() || selectedPort !== undefined
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

            {database?.id !== undefined && (
                <ComPortsFilter
                    devices={devices}
                    selectedPort={selectedPort}
                    onPortChange={handlePortChange}
                    technicalRun={technicalRun}
                    databaseId={database.id}
                    dispatch={dispatch}
                    allTemplates={allTemplates}
                    defaultBaseTemplateId={defaultBaseTemplateId}
                    defaultSensorTemplateId={defaultSensorTemplateId}
                />
            )}

            <div className={styles.list}>
                {devices.length === 0 ? (
                    <div className={styles.placeholder}>Нет устройств</div>
                ) : showNoResults ? (
                    <div className={styles.placeholder}>
                        {selectedPort !== undefined && !deviceSearchQuery.trim()
                            ? `Нет устройств на порту ${selectedPort}`
                            : `Ничего не найдено по запросу "${deviceSearchQuery}"`}
                    </div>
                ) : (
                    <PortableDevicesList
                        devices={filteredAndSortedDevices}
                        technicalRun={technicalRun}
                        activeFactoryNumber={activeFactoryNumber}
                    />
                )}
            </div>
        </div>
    );
}