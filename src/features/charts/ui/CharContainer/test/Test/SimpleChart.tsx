// SimpleChart.tsx - Контейнер для управления данными и состоянием графика
import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import EChartsChartView from './EChartsChartView';
import { ChartHeader } from '@charts/ui/CharContainer/ChartHeader/ChartHeader';
import {
    extractBinsFromTiles,
    binsToChartData,
    detectZoomAction,
    analyzeZoomWindow,
    formatTimeRange,
    prepareDataRequest,
    type ZoomAnalysis,
    type ZoomAction,
} from './chartDataUtils';
import styles from './SimpleChart.module.css';

export interface ZoomEventData {
    fieldName: string;
    action: 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'INITIAL';
    fromMs: number;
    toMs: number;
    spanMs: number;
    visibleBinsCount: number;
    totalBinsCount: number;
    density: number;
    bucketMs: number;
    needsMoreData: boolean;
    analysis: ZoomAnalysis; // Полный анализ для отладки
    requestData?: {
        from: Date;
        to: Date;
        px: number;
        bucketMs: number;
        expectedPoints: number;
    };
}

interface Props {
    fieldName: string;
    height?: number;
    showHeader?: boolean;
    onZoomChange?: (data: ZoomEventData) => void;
}

const SimpleChart: React.FC<Props> = ({
                                          fieldName,
                                          height = 350,
                                          showHeader = true,
                                          onZoomChange
                                      }) => {
    const previousWindowRef = useRef<{ fromMs: number; toMs: number } | null>(null);
    const lastEventTimeRef = useRef<number>(0);

    // Получаем данные из Redux
    const fieldView = useSelector((state: RootState) => state.charts.view[fieldName]);
    const currentBucketMs = fieldView?.currentBucketsMs || 60000;
    const loading = fieldView?.loading || false;
    const error = fieldView?.error;

    // Извлекаем и подготавливаем данные
    const { bins, chartData } = useMemo(() => {
        if (!fieldView || !currentBucketMs) {
            return { bins: [], chartData: [] };
        }

        const assembly = fieldView.seriesLevel[currentBucketMs]?.[0];
        if (!assembly?.tiles) {
            return { bins: [], chartData: [] };
        }

        const extractedBins = extractBinsFromTiles(assembly.tiles);
        const data = binsToChartData(extractedBins);

        console.log(`📊 [SimpleChart:${fieldName}] Данные обновлены:`, {
            поле: fieldName,
            бакет: currentBucketMs,
            всего_бинов: extractedBins.length,
            валидных_точек: data.length,
            тайлов: assembly.tiles.length,
            статусы_тайлов: assembly.tiles.map(t => ({
                status: t.status,
                bins: t.bins.length,
                range: formatTimeRange(t.coverageInterval.fromMs, t.coverageInterval.toMs),
            })),
        });

        return {
            bins: extractedBins,
            chartData: data
        };
    }, [fieldView, currentBucketMs, fieldName]);

    // Состояние текущего окна просмотра
    const [currentWindow, setCurrentWindow] = React.useState<{ fromMs: number; toMs: number } | null>(null);

    // Анализ текущего состояния
    const currentAnalysis = useMemo(() => {
        // Используем текущее окно если есть, иначе полный диапазон данных
        const window = currentWindow || (chartData.length > 0 ? {
            fromMs: Math.min(...chartData.map(d => d.timestamp)),
            toMs: Math.max(...chartData.map(d => d.timestamp))
        } : null);

        if (window && bins.length > 0) {
            return analyzeZoomWindow(
                window,
                bins,
                currentBucketMs,
                1200 // Примерная ширина графика
            );
        }
        return null;
    }, [currentWindow, bins, chartData, currentBucketMs]);

    // Обработчик изменения окна просмотра
    const handleWindowChange = useCallback((fromMs: number, toMs: number) => {
        const now = Date.now();

        // Защита от слишком частых вызовов
        if (now - lastEventTimeRef.current < 100) {
            return;
        }
        lastEventTimeRef.current = now;

        const newWindow = { fromMs, toMs };

        // Обновляем текущее окно для отображения
        setCurrentWindow(newWindow);

        // Определяем тип действия
        const action = detectZoomAction(newWindow, previousWindowRef.current);

        // Если изменение незначительное, игнорируем отправку события
        if (action.type === 'INITIAL' && previousWindowRef.current && action.magnitude < 1) {
            previousWindowRef.current = newWindow;
            return;
        }

        // Анализируем новое окно
        const analysis = analyzeZoomWindow(
            currentWindow,
            bins,
            currentBucketMs,
            1200
        );

        console.log(`🔍 [SimpleChart:${fieldName}] Изменение окна:`, {
            поле: fieldName,
            действие: action.type,
            сила: `${action.magnitude}%`,
            окно: formatTimeRange(fromMs, toMs),
            анализ: {
                видимых_точек: analysis.visibleBinsCount,
                всего_точек: analysis.totalBinsCount,
                плотность: `${analysis.density.toFixed(2)} точек/мин`,
                точек_на_пиксель: analysis.pointsPerPixel.toFixed(2),
                качество_данных: analysis.dataQuality,
                текущий_бакет: `${Math.round(currentBucketMs / 1000)}с`,
                оптимальный_бакет: `${Math.round(analysis.optimalBucketMs / 1000)}с`,
                нужна_загрузка: analysis.needsMoreData,
            },
        });

        // Подготавливаем данные для запроса, если нужно
        let requestData = undefined;
        if (analysis.needsMoreData) {
            requestData = prepareDataRequest(analysis, action);

            console.log(`📤 [SimpleChart:${fieldName}] Подготовлен запрос:`, {
                поле: fieldName,
                диапазон: formatTimeRange(
                    requestData.from.getTime(),
                    requestData.to.getTime()
                ),
                px: requestData.px,
                бакет: `${Math.round(requestData.bucketMs / 1000)}с`,
                ожидаемых_точек: requestData.expectedPoints,
            });
        }

        // Формируем событие для передачи наверх
        const eventData: ZoomEventData = {
            fieldName,
            action: action.type,
            fromMs,
            toMs,
            spanMs: toMs - fromMs,
            visibleBinsCount: analysis.visibleBinsCount,
            totalBinsCount: analysis.totalBinsCount,
            density: analysis.density,
            bucketMs: currentBucketMs,
            needsMoreData: analysis.needsMoreData,
            analysis,
            requestData,
        };

        // Сохраняем текущее окно
        previousWindowRef.current = currentWindow;

        // Передаем событие родителю
        if (onZoomChange) {
            onZoomChange(eventData);
        }
    }, [fieldName, bins, currentBucketMs, onZoomChange]);

    // Инициализация начального окна
    useEffect(() => {
        if (chartData.length > 0 && !previousWindowRef.current) {
            const minTime = Math.min(...chartData.map(d => d.timestamp));
            const maxTime = Math.max(...chartData.map(d => d.timestamp));

            previousWindowRef.current = {
                fromMs: minTime,
                toMs: maxTime,
            };

            console.log(`🎬 [SimpleChart:${fieldName}] Инициализация окна:`, {
                поле: fieldName,
                окно: formatTimeRange(minTime, maxTime),
                точек: chartData.length,
            });
        }
    }, [chartData, fieldName]);

    // Отображаем ошибку если есть
    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorMessage}>
                    Ошибка загрузки данных: {error}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {showHeader && (
                <ChartHeader
                    fieldName={fieldName}
                    title={fieldName}
                />
            )}

            <EChartsChartView
                fieldName={fieldName}
                data={chartData}
                height={height}
                bucketMs={currentBucketMs}
                visiblePointsCount={currentAnalysis?.visibleBinsCount || chartData.length}
                totalPointsCount={chartData.length}
                density={currentAnalysis?.density || 0}
                dataQuality={currentAnalysis?.dataQuality || 'HIGH'}
                loading={loading}
                onWindowChange={handleWindowChange}
            />

            {/* Панель отладки (можно включить при разработке) */}
            {process.env.NODE_ENV === 'development' && currentAnalysis && (
                <div className={styles.debugPanel}>
                    <h4>Debug Info</h4>
                    <pre>{JSON.stringify({
                        window: formatTimeRange(currentAnalysis.fromMs, currentAnalysis.toMs),
                        spanMinutes: Math.round(currentAnalysis.spanMinutes),
                        visiblePoints: currentAnalysis.visibleBinsCount,
                        density: currentAnalysis.density.toFixed(2),
                        quality: currentAnalysis.dataQuality,
                        needsData: currentAnalysis.needsMoreData,
                    }, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default SimpleChart;