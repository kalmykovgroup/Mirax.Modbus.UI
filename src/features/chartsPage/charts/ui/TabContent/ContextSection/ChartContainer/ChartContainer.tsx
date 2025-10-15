// components/ChartContainer/ChartContainer.tsx
// Корневой контейнер для всех графиков

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/baseStore/store.ts';
import { selectTemplate } from '@chartsPage/charts/core/store/selectors/base.selectors';
import styles from './ChartContainer.module.css';
import {useChartInitialization} from "@chartsPage/charts/orchestration/hooks/useChartInitialization.ts";
import {FieldChartContainer} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/FieldChartContainer.tsx";
import {useRequestManager} from "@chartsPage/charts/orchestration/hooks/useRequestManager.ts";


import { ENV } from '@/env';
const CHART_MIN_CONTAINER_WIDTH = ENV.CHART_MIN_CONTAINER_WIDTH;

export function ChartContainer() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);

    const manager = useRequestManager(); // Получаем менеджер из Context
    const contextId = manager.getContextId(); // Менеджер знает свой contextId

    const template = useSelector((state: RootState) => selectTemplate(state, contextId));

    /**
     * Измерение ширины контейнера
     * Запускается один раз при монтировании и при resize
     */
    useEffect(() => {
        const containerElement = containerRef.current;
        if (!containerElement) return;

        const measureWidth = (): void => {
            if (!containerRef.current) return;

            const width = containerRef.current.offsetWidth;
            if (width > 0) {
                const normalizedWidth = Math.max(CHART_MIN_CONTAINER_WIDTH, Math.round(width));

                setContainerWidth(prev => {
                    // Обновляем только если ширина действительно изменилась
                    if (prev !== normalizedWidth) {
                        return normalizedWidth;
                    }
                    return prev;
                });
            }
        };

        // Начальное измерение
        measureWidth();

        // Подписка на изменение размера
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width > 0) {
                    const normalizedWidth = Math.max(CHART_MIN_CONTAINER_WIDTH, Math.round(width));

                    setContainerWidth(prev => {
                        if (prev !== normalizedWidth) {
                            return normalizedWidth;
                        }
                        return prev;
                    });
                }
            }
        });

        resizeObserver.observe(containerElement);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);


    /**
     * Инициализация графиков
     * Запустится автоматически после измерения ширины
     */
    const { isInitializing, isInitialized, error, reinitialize } = useChartInitialization({
        contextId: contextId,
        px: containerWidth
    });

    // Состояние: нет template
    if (!template) {
        return (
            <div ref={containerRef} className={styles.container}>
                <div className={styles.empty}>
                    <p>Шаблон не загружен</p>
                </div>
            </div>
        );
    }

    // Состояние: измерение ширины контейнера
    if (containerWidth === undefined) {
        return (
            <div ref={containerRef} className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Подготовка графиков...</p>
                </div>
            </div>
        );
    }

    // Состояние: инициализация
    if (isInitializing) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Инициализация графиков...</p>
                </div>
            </div>
        );
    }

    // Состояние: ошибка инициализации
    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <p>Ошибка инициализации: {error}</p>
                    <button
                        className={styles.retryButton}
                        onClick={reinitialize}
                        type="button"
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    // Состояние: не инициализирован (не должно происходить, но для типобезопасности)
    if (!isInitialized) {
        return (
            <div className={styles.container}>
                <div className={styles.empty}>
                    <p>Графики не инициализированы</p>
                    <button
                        className={styles.retryButton}
                        onClick={reinitialize}
                        type="button"
                    >
                        Инициализировать
                    </button>
                </div>
            </div>
        );
    }


    // Основной контент: список графиков
    return (
        <div ref={containerRef} className={styles.container}>
            <div className={styles.chartsGrid}>
                {template.selectedFields.map(field => (
                        <FieldChartContainer
                            contextId={contextId}
                            key={field.name}
                            fieldName={field.name}
                            width={containerWidth}
                        />
                ))}
            </div>
        </div>
    );
}