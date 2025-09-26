// charts/ui/CharContainer/ChartCollection/ChartCollection.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {fetchMultiSeriesInit } from '@charts/store/thunks';
import { selectTimeSettings } from '@charts/store/chartsSettingsSlice';
import type { ResolvedCharReqTemplate } from '@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate';
import type { GetMultiSeriesRequest } from '@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest';
import styles from './ChartCollection.module.css';
import type {ChartEvent} from "@charts/ui/CharContainer/types/ChartEvent.ts";
import {formatDateWithTimezone} from "@charts/ui/TimeZonePicker/timezoneUtils.ts";
import FieldChart from "@charts/ui/CharContainer/ChartCollection/FieldChart/FieldChart.tsx";
import {setCurrentBucketMs, updateCurrentRange} from "@charts/store/chartsSlice.ts";
import { loadMissingData } from "@charts/ui/CharContainer/ChartCollection/loadMissingData.ts";

interface ChartCollectionProps {
    template: ResolvedCharReqTemplate;
}

/**
 * АРХИТЕКТУРА РАБОТЫ С ДАТАМИ:
 *
 * 1. template.from/to - это ЛОКАЛЬНЫЕ даты пользователя (как он их видит в UI)
 * 2. В store храним ЛОКАЛЬНЫЕ даты
 * 3. Преобразование в UTC происходит ТОЛЬКО в thunk перед отправкой
 * 4. НЕ делаем преобразования в компонентах
 */
export const ChartCollection: React.FC<ChartCollectionProps> = ({ template }) => {
    const dispatch = useAppDispatch();
    const containerRef = useRef<HTMLDivElement>(null);
    const eventLogRef = useRef<ChartEvent[]>([]);
    const lastRequestRef = useRef<string>('');

    // Изначально НЕ устанавливаем ширину, ждём реальное измерение
    const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
    const [containerHeight, setContainerHeight] = useState(500);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isContainerReady, setIsContainerReady] = useState(false);

    // Добавляем состояние для отслеживания загрузки по полям
    const [fieldsLoadingState, setFieldsLoadingState] = useState<Record<string, boolean>>({});

    // Получаем настройки временной зоны из Redux store
    const timeSettings = useAppSelector(selectTimeSettings);

    useEffect(() => {
        // Сбрасываем ключ последнего запроса для перезагрузки данных
        lastRequestRef.current = '';
    }, [timeSettings]);

    // Измеряем ширину контейнера
    useEffect(() => {
        if (!containerRef.current) return;

        // Получаем начальную ширину синхронно
        const initialWidth = containerRef.current.offsetWidth;
        if (initialWidth > 0) {
            setContainerWidth(Math.max(640, Math.round(initialWidth)));
            setIsContainerReady(true);
        }

        // Подписываемся на изменения размера
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width > 0) {
                    setContainerWidth(Math.max(640, Math.round(width)));
                    if (!isContainerReady) {
                        setIsContainerReady(true);
                    }
                }
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [isContainerReady]);

    // Загружаем данные ТОЛЬКО когда известна реальная ширина
    useEffect(() => {
        // Проверяем, что контейнер готов и ширина определена
        if (!isContainerReady || containerWidth === undefined) {
            return;
        }

        if (!template?.from || !template?.to) {
            return;
        }

        // Создаем уникальный ключ запроса
        const requestKey = [
            template.from.toISOString(),
            template.to.toISOString(),
            containerWidth,
            timeSettings.timeZone,
            timeSettings.useTimeZone
        ].join('-');

        // Пропускаем дубликаты
        if (lastRequestRef.current === requestKey) {
            return;
        }

        lastRequestRef.current = requestKey;

        // Передаем ЛОКАЛЬНЫЕ даты в запрос
        // Thunk сам преобразует их в UTC если нужно
        const request: GetMultiSeriesRequest = {
            template: template,
            from: template.from,  // Локальная дата
            to: template.to,      // Локальная дата
            px: containerWidth
        };

        setIsDataLoaded(false);
        dispatch(fetchMultiSeriesInit(request));

    }, [dispatch, template, containerWidth, timeSettings, isContainerReady]);


// Обновленный обработчик событий:

    const handleChartEvent = useCallback(async (event: ChartEvent) => {
        eventLogRef.current.push(event);

        switch (event.type) {
            case 'ready':
                break;

            case 'zoom':

                const newFrom = new Date(event.payload.from);
                const newTo = new Date(event.payload.to);

                // Обновляем текущий диапазон
                dispatch(updateCurrentRange({
                    field: event.field.name,
                    range: { from: newFrom, to: newTo }
                }));

                // Если нужна смена уровня - меняем
                if (event.payload.needsLevelSwitch && event.payload.suggestedBucket) {
                    dispatch(setCurrentBucketMs({
                        field: event.field.name,
                        bucketMs: event.payload.suggestedBucket
                    }));
                }

                // ЕДИНСТВЕННЫЙ вызов loadMissingData
                // Он сам определит какой bucket использовать из view
                const loaded = await dispatch(loadMissingData({
                    field: event.field,
                    containerWidth : containerWidth!,
                    targetBucketMs: event.payload.suggestedBucket // может быть undefined
                })).unwrap();

                if (loaded) {
                    console.log(`[ChartCollection] Загружены данные для ${event.field.name}`);
                }
                break;

            case 'levelSwitch':
                console.log(`Это событие информационное, данные уже загружены через zoom Level switch on ${event.field.name}:`, {
                    fromBucket: event.payload.fromBucket,
                    toBucket: event.payload.toBucket,
                    reason: event.payload.reason
                });
                break;

            case 'dataRequest':
                console.log(`Это событие информационное о начале загрузки ${event.field.name}`);
                if (event.payload?.reason === 'loading') {
                    setFieldsLoadingState(prev => ({
                        ...prev,
                        [event.field.name]: true
                    }));
                }
                break;

            case 'error':
                console.error(`Ошибка в ${event.field.name}:`, event.payload);
                setFieldsLoadingState(prev => ({
                    ...prev,
                    [event.field.name]: false
                }));
                break;
        }
    }, [dispatch, containerWidth]);

    // Вычисляем общее состояние загрузки
    const isAnyFieldLoading = Object.values(fieldsLoadingState).some(loading => loading);

    if (!template) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>Нет данных для отображения</div>
            </div>
        );
    }

    // Показываем индикатор загрузки, пока контейнер не измерен
    if (!isContainerReady || containerWidth === undefined) {
        return (
            <div ref={containerRef} className={styles.container}>
                <div className={styles.header}>
                    <h2>Графики данных</h2>
                    <div className={styles.info}>
                        <span>Инициализация...</span>
                    </div>
                </div>
                <div className={styles.loadingState}>
                    Измерение контейнера...
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={styles.container}>
            <div className={styles.header}>
                <h2>Графики данных</h2>
                <div className={styles.info}>
                    <span>Полей: {template.selectedFields.length}</span>
                    <span>Ширина: {containerWidth}px</span>
                    <span>Данные: {isDataLoaded ? '✓' : '⏳'}</span>
                    <span>События: {eventLogRef.current.length}</span>
                    {/* Добавляем общий индикатор загрузки */}
                    {isAnyFieldLoading && (
                        <span className={styles.loadingIndicator}>
                            🔄 Загрузка уровня...
                        </span>
                    )}
                </div>
            </div>

            {/* Панель управления временной зоной */}
            <div className={styles.controlPanel}>
                {/* Отображение текущего диапазона */}
                <div className={styles.dateRange}>
                    <span className={styles.dateLabel}>Диапазон (локальное время):</span>
                    <span className={styles.dateValue}>
                        {template.from && formatDateWithTimezone(template.from, timeSettings)}
                    </span>
                    <span className={styles.dateSeparator}>—</span>
                    <span className={styles.dateValue}>
                        {template.to && formatDateWithTimezone(template.to, timeSettings)}
                    </span>
                    {timeSettings.useTimeZone && (
                        <span className={styles.timezoneIndicator}>
                            (отображение: {timeSettings.timeZone})
                        </span>
                    )}
                </div>

                <div className={styles.infoNote}>
                    ℹ️ Даты хранятся как локальные, на сервер отправляются в UTC
                </div>

                {/* Индикатор загрузки по полям */}
                {Object.entries(fieldsLoadingState).some(([_, loading]) => loading) && (
                    <div className={styles.fieldsLoadingInfo}>
                        <span>Загрузка данных для полей: </span>
                        {Object.entries(fieldsLoadingState)
                            .filter(([_, loading]) => loading)
                            .map(([field, _]) => (
                                <span key={field} className={styles.fieldLoadingBadge}>
                                    {field}
                                </span>
                            ))
                        }
                    </div>
                )}
            </div>

            <div className={styles.chartsGrid}>
                {template.selectedFields.map((field) => (
                    <FieldChart
                        key={field.name}
                        field={field}
                        template={template}
                        onEvent={handleChartEvent}
                        containerWidth={containerWidth}
                        containerHeight={containerHeight}
                    />
                ))}
            </div>
        </div>
    );
};

export default ChartCollection;