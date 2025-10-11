// src/features/chartsPage/charts/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/PortableDeviceItem.tsx
import React, { useCallback, useRef, useMemo, useEffect, type JSX } from 'react';
import classNames from 'classnames';

import styles from './PortableDeviceItem.module.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { PortableDeviceDto } from '@chartsPage/mirax/contracts/PortableDeviceDto';
import type { TechnicalRunDto } from '@chartsPage/mirax/contracts/TechnicalRunDto';
import type { SensorDto } from '@chartsPage/mirax/contracts/SensorDto';
import {
    selectDevice,
    toggleDeviceExpanded,
    selectIsDeviceExpanded,
    selectSelectedDeviceFactoryNumber,
    selectDatabaseId,
    selectSensorsData,
    selectSensorsLoading,
} from '@chartsPage/mirax/miraxSlice';
import { fetchSensors } from '@chartsPage/mirax/miraxThunks';
import { CopyButton } from '@chartsPage/mirax/MiraxContainer/CopyButton/CopyButton';
import { SensorsList } from '@chartsPage/mirax/MiraxContainer/PortableDevicesList/PortableDeviceItem/SensorsList/SensorsList';
import type { LoadSensorsRequest } from '@chartsPage/mirax/miraxThunk.types';
import type {ChartReqTemplateDto} from "@chartsPage/template/shared/dtos/ChartReqTemplateDto.ts";
import {Guid} from "@app/lib/types/Guid.ts";
import {addContextToTab, createTab, setActiveTab} from "@chartsPage/charts/core/store/tabsSlice.ts";
import {resolveTemplateForServer} from "@chartsPage/template/ui/templateResolve.ts";
import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared/dtos/ResolvedCharReqTemplate.ts";
import {createContext} from "@chartsPage/charts/core/store/chartsSlice.ts";

interface Props {
    readonly device: PortableDeviceDto;
    readonly technicalRun: TechnicalRunDto;
    readonly isFirst: boolean;
}

// ========== КОНСТАНТЫ ДЕФОЛТНЫХ ШАБЛОНОВ ==========
const DEFAULT_BASE_TEMPLATE_ID = '0199d3de-88f4-7ed7-b9da-10a33742a3d4';
const DEFAULT_SENSOR_TEMPLATE_ID = '77777777-0000-0000-0000-000000000222';

/**
 * Метод для построения графиков: базовый шаблон + шаблоны для каждого сенсора
 */
async function logDeviceData(
    dispatch: ReturnType<typeof useAppDispatch>,
    technicalRun: TechnicalRunDto,
    device: PortableDeviceDto,
    sensors: readonly SensorDto[],
    allTemplates: readonly ChartReqTemplateDto[]
): Promise<void> {
    console.group('📊 Построение графиков для устройства');
    console.log('TechnicalRunDto:', technicalRun);
    console.log('PortableDeviceDto:', device);
    console.log('SensorDto[]:', sensors);

    try {
        // 1. Получить дефолтные шаблоны по ID
        const baseTemplate = allTemplates.find(t => t.id === DEFAULT_BASE_TEMPLATE_ID);
        const sensorTemplate = allTemplates.find(t => t.id === DEFAULT_SENSOR_TEMPLATE_ID);

        if (!baseTemplate) {
            console.error(' Базовый шаблон не найден:', DEFAULT_BASE_TEMPLATE_ID);
            alert('Базовый шаблон не найден. Проверьте конфигурацию.');
            return;
        }

        if (!sensorTemplate) {
            console.error(' Шаблон сенсора не найден:', DEFAULT_SENSOR_TEMPLATE_ID);
            alert('Шаблон сенсора не найден. Проверьте конфигурацию.');
            return;
        }

        // 2. Получить параметры для заполнения шаблонов
        const deviceId = device.factoryNumber ?? '';
        const technicalRunToStartId = technicalRun.id;

       /* // 3. Получить временной диапазон из испытания
        const fromMs = technicalRun.dateStarTime
            ? new Date(technicalRun.dateStarTime).getTime()
            : Date.now() - 24 * 60 * 60 * 1000; // По умолчанию: последние 24 часа

        const toMs = technicalRun.dateEndTime
            ? new Date(technicalRun.dateEndTime).getTime()
            : Date.now();*/

        // 4. Создать новую вкладку
        const newTabId = Guid.NewGuid();
        dispatch(
            createTab({
                id: newTabId,
                name: `${device.name ?? 'Устройство'} - ${device.factoryNumber}`,
            })
        );
        dispatch(setActiveTab(newTabId));

        console.log(' Создана вкладка:', { tabId: newTabId });

        // 5. Запустить базовый шаблон (BatteryVoltage, BatteryLevel, Temperature)
        const baseParams = {
            deviceId,
            technicalRunToStartId,
        };

        const baseResolved = resolveTemplateForServer(baseTemplate, baseParams) as ResolvedCharReqTemplate;
        /*baseResolved.resolvedFromMs = fromMs;
        baseResolved.resolvedToMs = toMs;*/

        const baseContextId = Guid.NewGuid();
        dispatch(
            createContext({
                contextId: baseContextId,
                template: baseResolved,
            })
        );
        dispatch(addContextToTab({ tabId: newTabId, contextId: baseContextId }));

        console.log(' Базовый шаблон запущен:', {
            templateId: baseTemplate.id,
            templateName: baseTemplate.name,
            contextId: baseContextId,
            params: baseParams,
        });

        // 6. Запустить шаблоны для каждого сенсора (Concentration)
        for (const sensor of sensors) {
            const sensorParams = {
                deviceId,
                technicalRunToStartId,
                channelNumber: sensor.channelNumber ?? 0,
            };

            const sensorResolved = resolveTemplateForServer(
                sensorTemplate,
                sensorParams
            ) as ResolvedCharReqTemplate;
            /*sensorResolved.resolvedFromMs = fromMs;
            sensorResolved.resolvedToMs = toMs;*/

            // Изменяем имя шаблона для удобства (добавляем номер канала и газ)
            sensorResolved.name = `${sensorTemplate.name} - Канал ${sensor.channelNumber} (${sensor.gas ?? 'N/A'})`;

            const sensorContextId = Guid.NewGuid();
            dispatch(
                createContext({
                    contextId: sensorContextId,
                    template: sensorResolved,
                })
            );
            dispatch(addContextToTab({ tabId: newTabId, contextId: sensorContextId }));

            console.log(' Шаблон сенсора запущен:', {
                templateId: sensorTemplate.id,
                templateName: sensorResolved.name,
                contextId: sensorContextId,
                channelNumber: sensor.channelNumber,
                gas: sensor.gas,
            });
        }

        console.log('🎉 Все графики успешно созданы!');
        console.log('📈 Всего контекстов:', 1 + sensors.length);

    } catch (error) {
        console.error(' Ошибка при построении графиков:', error);
        alert('Ошибка при построении графиков. См. консоль для деталей.');
    } finally {
        console.groupEnd();
    }
}


export function PortableDeviceItem({ device, technicalRun, isFirst }: Props): JSX.Element {
    //  Runtime-защита: проверяем обязательные данные
    if (!technicalRun || !device) {
        console.error('PortableDeviceItem: отсутствуют обязательные данные', {
            technicalRun,
            device,
        });
        return (
            <li className={styles.item}>
                <div className={styles.error}>Ошибка: отсутствуют данные устройства или испытания</div>
            </li>
        );
    }

    const dispatch = useAppDispatch();
    const databaseId = useAppSelector(selectDatabaseId);
    const factoryNumber = device.factoryNumber ?? '';
    const isExpanded = useAppSelector((state) => selectIsDeviceExpanded(state, factoryNumber));
    const isSelected = useAppSelector(selectSelectedDeviceFactoryNumber) === factoryNumber;
    const abortControllerRef = useRef<AbortController | undefined>(undefined);
    const firstLoadTriggeredRef = useRef(false);

    //  Получаем все шаблоны для построения графиков
    const allTemplates = useAppSelector((state) => state.chartsTemplates.items);

    //  Получаем данные сенсоров из slice
    const sensors = useAppSelector((state) =>
        selectSensorsData(state, technicalRun.id, factoryNumber)
    );

    //  Получаем статус загрузки сенсоров
    const sensorsLoadingState = useAppSelector((state) =>
        selectSensorsLoading(state, technicalRun.id, factoryNumber)
    );
    const isLoading = sensorsLoadingState.isLoading;

    // Автозагрузка сенсоров ТОЛЬКО для первого устройства через thunk
    useEffect(() => {
        if (!isFirst) return;

        const shouldTriggerLoad =
            !firstLoadTriggeredRef.current &&
            databaseId !== undefined &&
            factoryNumber !== '' &&
            sensors.length === 0 &&
            !isLoading;

        if (shouldTriggerLoad) {
            firstLoadTriggeredRef.current = true;

            const controller = new AbortController();
            abortControllerRef.current = controller;

            void dispatch(
                fetchSensors({
                    databaseId,
                    technicalRunId: technicalRun.id,
                    factoryNumber,
                    signal: controller.signal,
                } satisfies LoadSensorsRequest)
            );
        }
    }, [isFirst, databaseId, technicalRun.id, factoryNumber, sensors.length, isLoading, dispatch]);

    // Собираем уникальные газы из сенсоров
    const uniqueGases = useMemo(() => {
        const gasSet = new Set<string>();
        for (const sensor of sensors) {
            if (sensor.gas) {
                gasSet.add(sensor.gas);
            }
        }
        return Array.from(gasSet).sort();
    }, [sensors]);

    const handleSelect = useCallback(() => {
        if (factoryNumber) {
            dispatch(selectDevice(factoryNumber));
        }
    }, [dispatch, factoryNumber]);

    const handleToggle = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();

            if (!factoryNumber) return;

            dispatch(toggleDeviceExpanded(factoryNumber));

            // Загружаем сенсоры только если раскрываем И их ещё нет
            if (!isExpanded && sensors.length === 0 && databaseId !== undefined) {
                abortControllerRef.current?.abort();
                abortControllerRef.current = new AbortController();

                try {
                    await dispatch(
                        fetchSensors({
                            databaseId,
                            technicalRunId: technicalRun.id,
                            factoryNumber,
                            signal: abortControllerRef.current.signal,
                        } satisfies LoadSensorsRequest)
                    ).unwrap();
                } catch (error) {
                    if (
                        error !== null &&
                        typeof error === 'object' &&
                        'name' in error &&
                        error.name !== 'AbortError'
                    ) {
                        console.error('Ошибка загрузки сенсоров:', error);
                    }
                }
            }
        },
        [dispatch, factoryNumber, isExpanded, sensors.length, databaseId, technicalRun.id]
    );

    /**
     * Обработчик кнопки для вывода данных в консоль и построения графика
     */
    const handleBuildChart = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();

            let actualSensors = sensors;

            // Догружаем сенсоры только если их нет в кеше
            if (sensors.length === 0 && databaseId !== undefined && factoryNumber) {
                try {
                    const result = await dispatch(
                        fetchSensors({
                            databaseId,
                            technicalRunId: technicalRun.id,
                            factoryNumber,
                            signal: new AbortController().signal,
                        } satisfies LoadSensorsRequest)
                    ).unwrap();

                    actualSensors = result.data;
                } catch (error) {
                    console.error('Ошибка загрузки сенсоров:', error);
                    return;
                }
            }

            await logDeviceData(dispatch, technicalRun, device, actualSensors, allTemplates);
        },
        [technicalRun, device, sensors, databaseId, factoryNumber, dispatch]
    );

    return (
        <li className={classNames(styles.item, isSelected && styles.selected)}>
            <div className={styles.header} onClick={handleSelect}>
                <button
                    className={styles.expandButton}
                    onClick={handleToggle}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                    disabled={!factoryNumber}
                    type="button"
                >
                    <span className={classNames(styles.arrow, isExpanded && styles.expanded)}>▶</span>
                </button>

                <span className={styles.comPortLabel}>{device.comPortName}</span>

                <div className={styles.content}>
                    <div className={styles.nameContainer}>
                        <h4 className={styles.name}>{device.factoryNumber}</h4>
                        <CopyButton className={styles.btnCopyFactoryNumber} text={device.factoryNumber} label="Копировать factoryNumber устройства" />
                    </div>

                    <div className={styles.metaRow}>
                        {device.factoryNumber && (
                            <>
                                <span className={styles.factoryNumber}>ID:{device.id}</span>
                                <CopyButton className={styles.btnCopyFactoryNumber} text={device.id} label="Копировать ID устройства" />
                            </>


                        )}

                        {!isLoading && uniqueGases.length > 0 && (
                            <div className={styles.gasesContainer}>
                                {uniqueGases.map((gas) => (
                                    <span key={gas} className={styles.gasBadge}>
                                        {gas}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                            className={styles.chartButton}
                            onClick={handleBuildChart}
                            title="Построить график"
                            type="button"
                        >
                            📈 График
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className={styles.children}>
                    {isLoading ? (
                        <div className={styles.loading}>Загрузка сенсоров...</div>
                    ) : sensors.length > 0 ? (
                        <SensorsList sensors={sensors} />
                    ) : (
                        <div className={styles.empty}>Нет сенсоров</div>
                    )}
                </div>
            )}
        </li>
    );
}