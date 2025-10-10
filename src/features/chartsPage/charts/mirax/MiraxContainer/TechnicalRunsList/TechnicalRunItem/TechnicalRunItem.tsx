// src/features/mirax/components/TechnicalRunsList/TechnicalRunItem/TechnicalRunItem.tsx
import React, { useCallback, useRef, useMemo, useState, type JSX } from 'react';
import classNames from 'classnames';

import styles from './TechnicalRunItem.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';
import {
    selectTechnicalRun,
    toggleTechnicalRunExpanded,
    selectIsTechnicalRunExpanded,
    selectSelectedTechnicalRunId,
    selectDatabaseId,
} from '@chartsPage/charts/mirax/miraxSlice';
import { fetchPortableDevices } from '@chartsPage/charts/mirax/miraxThunks';
import { useGetPortableDevicesQuery } from '@chartsPage/charts/mirax/miraxApi';
import { PortableDevicesList } from '@chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDevicesList';
import { SearchInput } from '@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/SearchInput/SearchInput';
import {formatTechnicalRunDate} from "@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers.ts";

interface Props {
    readonly run: TechnicalRunDto;
}

export function TechnicalRunItem({ run }: Props): JSX.Element {
    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const isExpanded = useAppSelector((state) => selectIsTechnicalRunExpanded(state, run.id));
    const isSelected = useAppSelector(selectSelectedTechnicalRunId) === run.id;
    const abortControllerRef = useRef<AbortController | undefined>(undefined);

    const [deviceSearchQuery, setDeviceSearchQuery] = useState('');

    const { data: devices = [], isLoading } = useGetPortableDevicesQuery(
        {
            dbId: databaseId!,
            body: { technicalRunId: run.id },
        },
        {
            skip: !isExpanded || databaseId === undefined,
        }
    );

    // Фильтрация и сортировка устройств
    const filteredDevices = useMemo(() => {
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

        // Сортировка по factoryNumber
        return [...result].sort((a, b) => {
            const factoryA = a.factoryNumber ?? '';
            const factoryB = b.factoryNumber ?? '';

            // Устройства без factoryNumber идут в конец
            if (!factoryA && factoryB) return 1;
            if (factoryA && !factoryB) return -1;
            if (!factoryA && !factoryB) return 0;

            // Числовая сортировка если оба значения - числа
            const numA = parseInt(factoryA, 10);
            const numB = parseInt(factoryB, 10);

            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }

            // Лексикографическая сортировка
            return factoryA.localeCompare(factoryB, 'ru', { numeric: true });
        });
    }, [devices, deviceSearchQuery]);

    const handleSelect = useCallback(() => {
        dispatch(selectTechnicalRun(run.id));
    }, [dispatch, run.id]);

    const handleToggle = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();
            dispatch(toggleTechnicalRunExpanded(run.id));

            if (!isExpanded && databaseId !== undefined) {
                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                try {
                    await dispatch(
                        fetchPortableDevices({
                            databaseId,
                            technicalRunId: run.id,
                            signal: abortControllerRef.current.signal,
                        })
                    ).unwrap();
                } catch (error) {
                    console.error('Ошибка загрузки устройств:', error);
                }
            }

            // Сбрасываем поиск при сворачивании
            if (isExpanded) {
                setDeviceSearchQuery('');
            }
        },
        [dispatch, run.id, isExpanded, databaseId]
    );

    const handleDeviceSearchChange = useCallback((value: string) => {
        setDeviceSearchQuery(value);
    }, []);

    const handleDeviceSearchClear = useCallback(() => {
        setDeviceSearchQuery('');
    }, []);

    const showNoResults = deviceSearchQuery.trim() && filteredDevices.length === 0;

    return (
        <li className={classNames(styles.item, isSelected && styles.selected)}>
            <div className={styles.header} onClick={handleSelect}>
                <button
                    className={styles.expandButton}
                    onClick={handleToggle}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                >
                    <span className={classNames(styles.arrow, isExpanded && styles.expanded)}>▶</span>
                </button>

                <div className={styles.content}>
                    <h3 className={styles.name}>{run.name ?? 'Без названия'}</h3>
                    <div className={styles.dates}>
            <span className={styles.date}>
              <span className={styles.label}>Начало:</span>
                {formatTechnicalRunDate(run.dateStarTime)}
            </span>
                        <span className={styles.date}>
              <span className={styles.label}>Окончание:</span>
                            {formatTechnicalRunDate(run.dateEndTime)}
            </span>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className={styles.children}>
                    {isLoading ? (
                        <div className={styles.loading}>Загрузка устройств...</div>
                    ) : devices.length > 0 ? (
                        <>
                            <div className={styles.searchContainer}>
                                <SearchInput
                                    value={deviceSearchQuery}
                                    onChange={handleDeviceSearchChange}
                                    onClear={handleDeviceSearchClear}
                                    placeholder="Поиск устройства..."
                                />
                                <span className={styles.deviceCount}>
                  {deviceSearchQuery.trim()
                      ? `${filteredDevices.length} из ${devices.length}`
                      : `${devices.length}`}
                </span>
                            </div>

                            {showNoResults ? (
                                <div className={styles.empty}>
                                    Ничего не найдено по запросу "{deviceSearchQuery}"
                                </div>
                            ) : (
                                <PortableDevicesList devices={filteredDevices} technicalRunId={run.id} />
                            )}
                        </>
                    ) : (
                        <div className={styles.empty}>Нет устройств</div>
                    )}
                </div>
            )}
        </li>
    );
}