// components/ChartContainer/ChartContainer.tsx

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { selectTemplate } from '@chartsPage/charts/core/store/selectors/base.selectors';
import styles from './ChartContainer.module.css';
import { useChartInitialization } from "@chartsPage/charts/orchestration/hooks/useChartInitialization.ts";
import { FieldChartContainer } from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/FieldChartContainer.tsx";
import { useRequestManager } from "@chartsPage/charts/orchestration/hooks/useRequestManager.ts";
import { ENV } from '@/env';

const CHART_MIN_CONTAINER_WIDTH = ENV.CHART_MIN_CONTAINER_WIDTH;

export function ChartContainer() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
    const [_activeFieldIndex, setActiveFieldIndex] = useState<number>(0);

    const manager = useRequestManager();
    const contextId = manager.getContextId();

    const template = useSelector((state: RootState) => selectTemplate(state, contextId));

    // Мемоизированный массив имён полей
    const fieldNames = useMemo(() => {
        if (!template) return [];
        return template.selectedFields.map(f => f.name);
    }, [template]);

    // Навигация между графиками
    const handleNavigatePrevious = useCallback(() => {
        setActiveFieldIndex(prev => Math.max(0, prev - 1));
    }, []);

    const handleNavigateNext = useCallback(() => {
        setActiveFieldIndex(prev => Math.min(fieldNames.length - 1, prev + 1));
    }, [fieldNames.length]);

    /**
     * Измерение ширины контейнера
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
                    if (prev !== normalizedWidth) {
                        return normalizedWidth;
                    }
                    return prev;
                });
            }
        };

        measureWidth();

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
     */
    const { isInitializing, isInitialized, error, reinitialize } = useChartInitialization({
        contextId: contextId,
        px: containerWidth
    });

    if (!template) {
        return (
            <div ref={containerRef} className={styles.container}>
                <div className={styles.empty}>
                    <p>Шаблон не загружен</p>
                </div>
            </div>
        );
    }

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

    return (
        <div ref={containerRef} className={styles.container}>
            <div className={styles.chartsGrid}>
                {template.selectedFields.map((field, index) => (
                    <FieldChartContainer
                        contextId={contextId}
                        key={field.name}
                        fieldName={field.name}
                        width={containerWidth}
                        navigationInfo={{
                            currentIndex: index,
                            totalFields: fieldNames.length,
                            onPrevious: handleNavigatePrevious,
                            onNext: handleNavigateNext
                        }}
                    />
                ))}
            </div>
        </div>
    );
}