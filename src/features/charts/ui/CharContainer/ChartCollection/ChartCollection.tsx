// charts/ui/CharContainer/ChartCollection/ChartCollection.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMultiSeriesInit } from '@charts/store/thunks';
import { selectTimeSettings, selectIsDataLoaded } from '@charts/store/selectors.ts';
import type { ResolvedCharReqTemplate } from '@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate';
import type { GetMultiSeriesRequest } from '@charts/shared/contracts/chart/Dtos/Requests_/GetMultiSeriesRequest';
import styles from './ChartCollection.module.css';
import { formatDateWithTimezone } from "@charts/ui/TimeZonePicker/timezoneUtils.ts";
import {
    ResizableContainer,
    SyncGroupControl
} from "@charts/ui/CharContainer/ChartCollection/ResizableContainer/ResizableContainer.tsx";
import FieldChart from "@charts/ui/CharContainer/ChartCollection/FieldChart/FieldChart.tsx";

interface ChartCollectionProps {
    template: ResolvedCharReqTemplate;
}

export const ChartCollection: React.FC<ChartCollectionProps> = ({ template }) => {
    const dispatch = useAppDispatch();
    const containerRef = useRef<HTMLDivElement>(null);
    const lastRequestRef = useRef<string>('');
    const lastPxRef = useRef<number | undefined>(undefined);
    const isInitializedRef = useRef(false);

    // Измеряем общую ширину коллекции для первичной загрузки
    const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
    // Отслеживаем только высоту через ResizableContainer
    const [containerHeight, setContainerHeight] = useState<number>(1000);

    const timeSettings = useAppSelector(selectTimeSettings);
    const isDataLoaded = useAppSelector(selectIsDataLoaded);

    useEffect(() => {
        lastRequestRef.current = '';
    }, [timeSettings]);

    // Измеряем общую ширину коллекции
    useEffect(() => {
        if (!containerRef.current) return;

        const measureWidth = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.offsetWidth;
            if (width > 0) {
                const newWidth = Math.max(640, Math.round(width));
                setContainerWidth(newWidth);
            }
        };

        // Начальное измерение
        measureWidth();

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width > 0) {
                    const newWidth = Math.max(640, Math.round(width));
                    // Только обновляем если ширина действительно изменилась
                    setContainerWidth(prev => {
                        if (prev !== newWidth) {
                            return newWidth;
                        }
                        return prev;
                    });
                }
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Сохраняем текущую ширину для отслеживания изменений
    useEffect(() => {
        if (containerWidth !== undefined) {
            lastPxRef.current = containerWidth;
        }
    }, [containerWidth]);

    // Загружаем данные когда известна ширина и есть template
    useEffect(() => {
        if (containerWidth === undefined || !template?.from || !template?.to) {
            return;
        }

        // Только при первой инициализации или изменении ключевых параметров
        const requestKey = [
            template.from.toISOString(),
            template.to.toISOString(),
            containerWidth,
            timeSettings.timeZone,
            timeSettings.useTimeZone
        ].join('-');

        if (lastRequestRef.current === requestKey) {
            return;
        }

        lastRequestRef.current = requestKey;

        // Загружаем данные только если они еще не загружены или изменились параметры
        if (!isDataLoaded || !isInitializedRef.current) {
            const request: GetMultiSeriesRequest = {
                template: template,
                from: template.from,
                to: template.to,
                px: containerWidth
            };

            dispatch(fetchMultiSeriesInit(request));
            isInitializedRef.current = true;
        }
    }, [dispatch, template, containerWidth, timeSettings, isDataLoaded]);

    if (!template) {
        return (
            <div className={styles.emptyState}>
                Нет данных для отображения
            </div>
        );
    }

    const groupId = "chart-collection";

    return (
        <div ref={containerRef} className={styles.chartCollectionContainer}>
            <SyncGroupControl groupId={groupId} />

            <div className={styles.header}>
                <h2>Графики данных</h2>
                <div className={styles.info}>
                    <span>Полей: {template.selectedFields.length}</span>
                    <span>Ширина: {containerWidth}px</span>
                    <span>Данные: {isDataLoaded ? '✓' : '⏺'}</span>
                </div>
            </div>

            <div className={styles.controlPanel}>
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
            </div>

            <div className={styles.chartsGrid}>
                {containerWidth && template.selectedFields.map((field) => {

                  return (
                        <ResizableContainer
                            key={field.name}
                            groupId={groupId}
                            defaultHeight={containerHeight}
                            minHeight={300}
                            maxHeight={2000}
                            onHeightChange={setContainerHeight}
                        >
                            <FieldChart
                                field={field}
                                template={template}
                                containerWidth={containerWidth}
                                containerHeight={containerHeight}
                            />
                        </ResizableContainer>
                    );
                })}
            </div>
        </div>
    );
};