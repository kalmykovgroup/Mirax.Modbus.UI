// charts/ui/CharContainer/ChartCollection/ChartCollection.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMultiSeriesSimple } from '@charts/store/thunks';
import { selectTimeSettings } from '@charts/store/chartsSettingsSlice';
import type { ResolvedCharReqTemplate } from '@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate';
import type { GetMultiSeriesRequest } from '@charts/shared/contracts/chart/Dtos/Requests/GetMultiSeriesRequest';
import styles from './ChartCollection.module.css';
import type {ChartEvent} from "@charts/ui/CharContainer/types/ChartEvent.ts";
import {formatDateWithTimezone} from "@charts/ui/TimeZonePicker/timezoneUtils.ts";
import FieldChart from "@charts/ui/CharContainer/ChartCollection/FieldChart/FieldChart.tsx";
import {setCurrentBucketMs, updateCurrentRange} from "@charts/store/chartsSlice.ts";

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
            console.log('[ChartCollection] Ожидаем измерение контейнера...');
            return;
        }

        if (!template?.from || !template?.to) {
            console.log('[ChartCollection] Шаблон не готов');
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
            console.log('[ChartCollection] Пропускаем дубликат запроса');
            return;
        }

        console.log('[ChartCollection] Выполняем запрос с шириной:', containerWidth);
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
        dispatch(fetchMultiSeriesSimple(request));

    }, [dispatch, template, containerWidth, timeSettings, isContainerReady]);

    // Обработчик событий от графиков
    const handleChartEvent = useCallback((event: ChartEvent) => {
        console.log(`[ChartCollection] Event received:`, event);
        eventLogRef.current.push(event);

        switch (event.type) {
            case 'ready':
                console.log(`График ${event.field} готов!`);
                break;

            case 'zoom':
                console.log(`Zoom on ${event.field}:`, {
                    range: event.payload,
                    needsLevelSwitch: event.payload?.needsLevelSwitch
                });

                dispatch(updateCurrentRange(
                    { field: event.field,
                        range: {from: new Date(event.payload.from), to: new Date(event.payload.to)}
                    }));

                if (event.payload?.needsLevelSwitch && event.payload?.suggestedBucket) {

                    dispatch(setCurrentBucketMs({
                        field: event.field,
                        bucketMs: event.payload.suggestedBucket
                    }));

                    // Здесь можно диспатчить action для смены bucket
                    console.log(`Suggesting bucket switch to: ${event.payload.suggestedBucket}ms`);
                }
                break;

            case 'levelSwitch':
                console.log(`Level switch on ${event.field}:`, {
                    from: `${event.payload?.fromBucketFormatted} (${event.payload?.fromBucket}ms)`,
                    to: `${event.payload?.toBucketFormatted} (${event.payload?.toBucket}ms)`,
                    reason: event.payload?.reason
                });

                // Устанавливаем состояние загрузки для этого поля при смене уровня
                setFieldsLoadingState(prev => ({
                    ...prev,
                    [event.field]: true
                }));

                // TODO: Здесь должен быть запрос данных для нового уровня
                // После успешной загрузки нужно сбросить флаг загрузки
                setTimeout(() => {
                    setFieldsLoadingState(prev => ({
                        ...prev,
                        [event.field]: false
                    }));
                }, 2000); // Временная заглушка
                break;

            case 'dataRequest':
                console.log(`Data request from ${event.field}:`, {
                    bucket: event.payload?.bucketMs,
                    range: event.payload?.range
                });

                // Обновляем состояние загрузки при запросе данных
                if (event.payload?.reason === 'loading') {
                    setFieldsLoadingState(prev => ({
                        ...prev,
                        [event.field]: true
                    }));
                }
                break;

            case 'error':
                console.error(`Ошибка в ${event.field}:`, event.payload);
                // Сбрасываем состояние загрузки при ошибке
                setFieldsLoadingState(prev => ({
                    ...prev,
                    [event.field]: false
                }));
                break;
        }
    }, [dispatch]);

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
                        fieldName={field.name}
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