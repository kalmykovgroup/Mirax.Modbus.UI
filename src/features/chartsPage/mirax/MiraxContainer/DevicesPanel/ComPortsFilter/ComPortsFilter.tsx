// src/features/chartsPage/charts/mirax/MiraxContainer/DevicesPanel/ComPortsFilter/ComPortsFilter.tsx
import { useMemo, useCallback, useState, useRef, useEffect, type JSX } from 'react';
import classNames from 'classnames';

import type { PortableDeviceDto } from '@chartsPage/mirax/contracts/PortableDeviceDto';
import type { TechnicalRunDto } from '@chartsPage/mirax/contracts/TechnicalRunDto';
import type { SensorDto } from '@chartsPage/mirax/contracts/SensorDto';
import type { LoadSensorsRequest } from '@chartsPage/mirax/miraxThunk.types';
import type { AppDispatch } from '@/baseStore/store.ts';
import type { Guid } from '@app/lib/types/Guid';
import { fetchSensors } from '@chartsPage/mirax/miraxThunks';
import { buildCharts } from '@chartsPage/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/buildCharts';
import { notify } from '@app/lib/notify';
import styles from './ComPortsFilter.module.css';
import type {ChartReqTemplateDto} from "@chartsPage/template/shared/dtos/ChartReqTemplateDto.ts";

interface Props {
    readonly devices: readonly PortableDeviceDto[];
    readonly selectedPort: string | undefined;
    readonly onPortChange: (port: string | undefined) => void;
    readonly technicalRun: TechnicalRunDto;
    readonly databaseId: Guid;
    readonly dispatch: AppDispatch;
    readonly allTemplates: readonly ChartReqTemplateDto[];
    readonly defaultBaseTemplateId: Guid | undefined;
    readonly defaultSensorTemplateId: Guid | undefined;
}

/**
 * Фильтр по COM-портам с возможностью построения графиков для всех устройств порта.
 * Вкладки портов, зафиксированные в header панели устройств.
 */
export function ComPortsFilter({
                                   devices,
                                   selectedPort,
                                   onPortChange,
                                   technicalRun,
                                   databaseId,
                                   dispatch,
                                   allTemplates,
                                   defaultBaseTemplateId,
                                   defaultSensorTemplateId,
                               }: Props): JSX.Element | null {
    const [hoveredPort, setHoveredPort] = useState<string | undefined>(undefined);
    const [buildingPort, setBuildingPort] = useState<string | undefined>(undefined);
    const databaseIdRef = useRef(databaseId);

    useEffect(() => {
        databaseIdRef.current = databaseId;
    }, [databaseId]);

    /**
     * Извлечь уникальные COM-порты и отсортировать их
     */
    const uniquePorts = useMemo((): readonly string[] => {
        const portsSet = new Set<string>();

        for (const device of devices) {
            const portName = device.comPortName;
            if (portName !== undefined && portName.trim() !== '') {
                portsSet.add(portName);
            }
        }

        // Сортировка: COM1, COM2, ..., COM10, COM11
        return Array.from(portsSet).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });
    }, [devices]);

    /**
     * Обработчик клика на вкладку порта.
     * Повторный клик на активный порт сбрасывает фильтр.
     */
    const handlePortClick = useCallback(
        (port: string): void => {
            onPortChange(selectedPort === port ? undefined : port);
        },
        [selectedPort, onPortChange]
    );

    /**
     * Получить устройства для конкретного порта
     */
    const getDevicesForPort = useCallback(
        (port: string): readonly PortableDeviceDto[] => {
            return devices.filter((d) => {
                const portName = d.comPortName;
                return portName !== undefined && portName === port;
            });
        },
        [devices]
    );

    /**
     * Подсчёт устройств для конкретного порта
     */
    const getPortDeviceCount = useCallback(
        (port: string): number => {
            return getDevicesForPort(port).length;
        },
        [getDevicesForPort]
    );

    /**
     * Построение графиков для всех устройств порта
     */
    const handleBuildChartsForPort = useCallback(
        async (e: React.MouseEvent, port: string): Promise<void> => {
            e.stopPropagation();

            if (databaseIdRef.current === undefined) {
                notify.error('Database is undefined');
                return;
            }

            const portDevices = getDevicesForPort(port);
            if (portDevices.length === 0) {
                notify.error(`Нет устройств на порту ${port}`);
                return;
            }

            setBuildingPort(port);

            try {
                // Обрабатываем каждое устройство последовательно
                for (const device of portDevices) {
                    const factoryNumber = device.factoryNumber ?? '';
                    if (factoryNumber === '') {
                        console.warn('Устройство без factoryNumber:', device);
                        continue;
                    }

                    if (defaultBaseTemplateId === undefined) {
                        notify.error(`defaultBaseTemplateId is undefined | ${device.factoryNumber} | ${device.id}`);
                        continue;
                    }

                    if (defaultSensorTemplateId === undefined) {
                        notify.error(`defaultSensorTemplateId is undefined | ${device.factoryNumber} | ${device.id}`);
                        continue;
                    }

                    let actualSensors: readonly SensorDto[] = [];

                    // Всегда загружаем сенсоры через API
                    try {
                        const result = await dispatch(
                            fetchSensors({
                                databaseId: databaseIdRef.current,
                                technicalRunId: technicalRun.id,
                                factoryNumber,
                                signal: new AbortController().signal,
                            } satisfies LoadSensorsRequest)
                        ).unwrap();

                        actualSensors = result.data;
                    } catch (error) {
                        console.error(
                            `Ошибка загрузки сенсоров для устройства ${factoryNumber}:`,
                            error
                        );
                        // Продолжаем со следующим устройством
                        continue;
                    }

                    // Строим графики для устройства
                    await buildCharts(
                        dispatch,
                        technicalRun,
                        device,
                        actualSensors,
                        allTemplates,
                        defaultBaseTemplateId,
                        defaultSensorTemplateId,
                        databaseIdRef.current
                    );
                }

                notify.success(`Графики построены для ${portDevices.length} устройств на ${port}`);
            } catch (error) {
                console.error(`Ошибка построения графиков для порта ${port}:`, error);
                notify.error('Ошибка построения графиков');
            } finally {
                setBuildingPort(undefined);
            }
        },
        [
            getDevicesForPort,
            technicalRun,
            dispatch,
            allTemplates,
            defaultBaseTemplateId,
            defaultSensorTemplateId,
        ]
    );

    // Не показываем фильтр, если портов меньше 2
    if (uniquePorts.length < 2) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                {uniquePorts.map((port) => {
                    const deviceCount = getPortDeviceCount(port);
                    const isHovered = hoveredPort === port;
                    const isBuilding = buildingPort === port;

                    return (
                        <div
                            key={port}
                            className={styles.tabWrapper}
                            onMouseEnter={() => setHoveredPort(port)}
                            onMouseLeave={() => setHoveredPort(undefined)}
                        >
                            <button
                                type="button"
                                className={classNames(
                                    styles.tab,
                                    selectedPort === port && styles.tabActive
                                )}
                                onClick={() => handlePortClick(port)}
                                title={
                                    selectedPort === port
                                        ? `Сбросить фильтр ${port}`
                                        : `Фильтр по ${port}`
                                }
                            >
                                <span className={styles.tabTitle}>{port}</span>
                                <span className={styles.tabCount}>({deviceCount})</span>
                            </button>

                            {isHovered && (
                                <button
                                    type="button"
                                    className={styles.buildButton}
                                    onClick={(e) => handleBuildChartsForPort(e, port)}
                                    disabled={isBuilding}
                                    title={`Построить графики для всех устройств на ${port}`}
                                >
                                    {isBuilding ? '⏳' : '📈'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}