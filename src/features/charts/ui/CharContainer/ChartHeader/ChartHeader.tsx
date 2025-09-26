// ChartHeader.tsx
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createSelector } from '@reduxjs/toolkit';
import type { FieldName, BucketsMs, CoverageInterval } from '@charts/store/chartsSlice';
import {
    selectFieldViewSafe,
    selectTemplateDomain,
    selectCurrentBucketMs,
    selectFieldLoading,
    selectFieldError,
} from '@charts/store/selectors';
import { LevelRow } from '@charts/ui/CharContainer/ChartHeader/LevelRow/LevelRow';
import {
    runFullTestSuite,
    testInitializeMultipleLevels,
    testIncrementalLoad,
    testSwitchLevel,
    testPanNavigation,
    testLoadingErrors
} from '@charts/store/thunks.test';
import styles from './ChartHeader.module.css';

export type HeaderProps = {
    fieldName: FieldName;
    title?: string;
    showDetails?: boolean;
    enableTestControls?: boolean;
    enableDebugLogs?: boolean; // Добавляем флаг для включения отладки
};

// Типы для внутреннего представления
export type LevelInfo = {
    bucketMs: BucketsMs;
    bucketLabel: string;
    coverage: CoverageInterval[];
    loadingCoverage: CoverageInterval[];
    errorCoverage: CoverageInterval[];
    totalBins: number;
    coveredBins: number;
    coveragePercent: number;
    isCurrent: boolean;
    // Добавляем отладочную информацию
    debugInfo?: {
        totalTiles: number;
        readyTiles: number;
        loadingTiles: number;
        errorTiles: number;
        totalDataPoints: number;
    };
};

type HeaderData = {
    levels: LevelInfo[];
    domain: { from: number; to: number } | null;
    currentBucketMs: BucketsMs | undefined;
    isFieldLoading: boolean;
    fieldError: string | undefined;
    totalLevels: number;
};

// Функция форматирования размера бакета
function formatBucketSize(ms: number): string {
    if (!ms || !Number.isFinite(ms)) return '—';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}г`;
    if (months > 0) return `${months}мес`;
    if (weeks > 0) return `${weeks}нед`;
    if (days > 0) return `${days}д`;
    if (hours > 0) return `${hours}ч`;
    if (minutes > 0) return `${minutes}мин`;
    return `${seconds}с`;
}

// Основной компонент Header
export const ChartHeader: React.FC<HeaderProps> = ({
                                                       fieldName,
                                                       title,
                                                       showDetails = true,
                                                       enableTestControls = true,
                                                       enableDebugLogs = true // По умолчанию включена отладка
                                                   }) => {
    const dispatch = useAppDispatch();
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [showDebugInfo, setShowDebugInfo] = useState(false);

    // Создаем мемоизированный селектор для всех данных
    const dataSelector = useMemo(
        () => createSelector(
            selectFieldViewSafe(fieldName),
            selectTemplateDomain,
            selectCurrentBucketMs(fieldName),
            selectFieldLoading(fieldName),
            selectFieldError(fieldName),
            ({ view }, domain, currentBucketMs, isLoading, error): HeaderData => {
                const levels: LevelInfo[] = [];

                if (enableDebugLogs) {
                    console.group(`[Header] Обработка данных для ${fieldName}`);
                    console.log('Domain:', domain);
                    console.log('Current bucket:', currentBucketMs);
                    console.log('View exists:', !!view);
                }

                if (!domain) {
                    if (enableDebugLogs) {
                        console.log('❌ Domain отсутствует');
                        console.groupEnd();
                    }
                    return {
                        levels: [],
                        domain: null,
                        currentBucketMs,
                        isFieldLoading: isLoading ?? false,
                        fieldError: error,
                        totalLevels: 0,
                    };
                }

                const domainMs = {
                    from: domain.from.getTime(),
                    to: domain.to.getTime(),
                };

                if (enableDebugLogs) {
                    console.log('Domain in ms:', {
                        from: new Date(domainMs.from).toISOString(),
                        to: new Date(domainMs.to).toISOString(),
                        span: (domainMs.to - domainMs.from) / 1000 / 60, // в минутах
                    });
                }

                // Если view не инициализирован, возвращаем пустой результат
                if (!view) {
                    if (enableDebugLogs) {
                        console.log('❌ View не инициализирован');
                        console.groupEnd();
                    }
                    return {
                        levels: [],
                        domain: domainMs,
                        currentBucketMs,
                        isFieldLoading: isLoading ?? false,
                        fieldError: error,
                        totalLevels: 0,
                    };
                }

                // Получаем ВСЕ уровни из seriesLevel (включая пустые)
                const bucketMsList = Object.keys(view.seriesLevel ?? {})
                    .map(k => Number(k) as BucketsMs)
                    .filter(b => Number.isFinite(b) && b > 0)
                    .sort((a, b) => b - a); // Сортируем от большего к меньшему

                if (enableDebugLogs) {
                    console.log('Найденные уровни:', bucketMsList.map(ms => formatBucketSize(ms)));
                }

                // Обрабатываем каждый уровень
                bucketMsList.forEach(bucketMs => {
                    // Получаем tiles напрямую из seriesLevel
                    const tiles = view.seriesLevel[bucketMs] || [];

                    // Разделяем тайлы по статусам
                    const readyTiles = tiles.filter(t => t.status === 'ready');
                    const loadingTiles = tiles.filter(t => t.status === 'loading');
                    const errorTiles = tiles.filter(t => t.status === 'error');

                    // Подсчитываем общее количество данных
                    const totalDataPoints = readyTiles.reduce((sum, tile) =>
                        sum + (tile.bins?.length || 0), 0
                    );

                    if (enableDebugLogs) {
                        console.group(`Уровень ${formatBucketSize(bucketMs)} (${bucketMs}ms):`);
                        console.log('Всего тайлов:', tiles.length);
                        console.log('Ready:', readyTiles.length);
                        console.log('Loading:', loadingTiles.length);
                        console.log('Error:', errorTiles.length);
                        console.log('Точек данных:', totalDataPoints);

                        if (readyTiles.length > 0) {
                            console.log('Ready tiles coverage:', readyTiles.map(t => ({
                                from: new Date(t.coverageInterval.fromMs).toISOString(),
                                to: new Date(t.coverageInterval.toMs).toISOString(),
                                bins: t.bins?.length || 0
                            })));
                        }
                        console.groupEnd();
                    }

                    // Извлекаем интервалы покрытия
                    const coverage = readyTiles.map(t => t.coverageInterval);
                    const loadingCoverage = loadingTiles.map(t => t.coverageInterval);
                    const errorCoverage = errorTiles.map(t => t.coverageInterval);

                    // Вычисляем статистику
                    const totalMs = domainMs.to - domainMs.from;
                    const totalBins = Math.ceil(totalMs / bucketMs);

                    // Считаем покрытые бины
                    let coveredMs = 0;
                    coverage.forEach(interval => {
                        const start = Math.max(interval.fromMs, domainMs.from);
                        const end = Math.min(interval.toMs, domainMs.to);
                        if (end > start) {
                            const intervalCoverage = end - start;
                            coveredMs += intervalCoverage;

                            if (enableDebugLogs && readyTiles.length > 0) {
                                console.log(`[Coverage] Интервал покрытия:`, {
                                    interval: {
                                        from: new Date(interval.fromMs).toISOString(),
                                        to: new Date(interval.toMs).toISOString()
                                    },
                                    effectiveRange: {
                                        from: new Date(start).toISOString(),
                                        to: new Date(end).toISOString()
                                    },
                                    coverageMs: intervalCoverage,
                                    coverageMinutes: intervalCoverage / 1000 / 60,
                                });
                            }
                        }
                    });

                    const coveredBins = Math.floor(coveredMs / bucketMs);
                    const coveragePercent = totalBins > 0
                        ? Math.round((coveredMs / totalMs) * 100)
                        : 0;

                    if (enableDebugLogs && tiles.length > 0) {
                        console.log(`Покрытие: ${coveredBins}/${totalBins} бинов (${coveragePercent}%)`);
                        console.log(`Покрыто времени: ${coveredMs / 1000 / 60} минут из ${totalMs / 1000 / 60} минут`);
                    }

                    levels.push({
                        bucketMs,
                        bucketLabel: formatBucketSize(bucketMs),
                        coverage,
                        loadingCoverage,
                        errorCoverage,
                        totalBins,
                        coveredBins,
                        coveragePercent,
                        isCurrent: bucketMs === currentBucketMs,
                        debugInfo: {
                            totalTiles: tiles.length,
                            readyTiles: readyTiles.length,
                            loadingTiles: loadingTiles.length,
                            errorTiles: errorTiles.length,
                            totalDataPoints
                        }
                    });
                });

                if (enableDebugLogs) {
                    console.log('Итоговые уровни:', levels.length);
                    console.groupEnd();
                }

                return {
                    levels,
                    domain: domainMs,
                    currentBucketMs,
                    isFieldLoading: isLoading ?? false,
                    fieldError: error,
                    totalLevels: levels.length,
                };
            }
        ),
        [fieldName, enableDebugLogs]
    );

    // Получаем данные
    const data = useAppSelector(dataSelector);

    // Логируем изменения данных
    useEffect(() => {
        if (enableDebugLogs) {
            console.log(`[Header Effect] Данные обновлены для ${fieldName}:`, {
                levels: data.levels.length,
                domain: data.domain,
                currentBucket: data.currentBucketMs ? formatBucketSize(data.currentBucketMs) : 'не установлен',
                loading: data.isFieldLoading,
                error: data.fieldError
            });
        }
    }, [data, fieldName, enableDebugLogs]);

    // Считаем общую статистику
    const totalCoverage = useMemo(() => {
        if (!data.levels.length) return 0;
        // Считаем среднее покрытие только для уровней с данными
        const levelsWithData = data.levels.filter(level =>
            level.debugInfo && level.debugInfo.totalTiles > 0
        );
        if (levelsWithData.length === 0) return 0;

        const sum = levelsWithData.reduce((acc, level) => acc + level.coveragePercent, 0);
        return Math.round(sum / levelsWithData.length);
    }, [data.levels]);

    // Обработчики для тестовых кнопок
    const handleRunFullTest = useCallback(async () => {
        setIsTestRunning(true);
        try {
            await dispatch(runFullTestSuite({ fieldName })).unwrap();
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            setIsTestRunning(false);
        }
    }, [dispatch, fieldName]);

    const handleInitLevels = useCallback(() => {
        dispatch(testInitializeMultipleLevels({ fieldName }));
    }, [dispatch, fieldName]);

    const handleIncrementalLoad = useCallback(() => {
        dispatch(testIncrementalLoad({ fieldName, targetCoverage: 80 }));
    }, [dispatch, fieldName]);

    const handlePanTest = useCallback(() => {
        dispatch(testPanNavigation({
            fieldName,
            direction: 'both',
            panSteps: 2
        }));
    }, [dispatch, fieldName]);

    const handleSwitchLevel = useCallback(() => {
        dispatch(testSwitchLevel({
            fieldName,
            targetBucketMs: 60 * 1000
        }));
    }, [dispatch, fieldName]);

    const handleTestErrors = useCallback(() => {
        dispatch(testLoadingErrors({ fieldName }));
    }, [dispatch, fieldName]);

    return (
        <div className={styles.container}>
            {/* Заголовок с общей статистикой */}
            <div className={styles.header}>
                <div className={styles.title}>
                    {title || fieldName}
                    {data.isFieldLoading && (
                        <span className={styles.loadingIndicator}>
                            (загрузка...)
                        </span>
                    )}
                </div>

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Уровни</div>
                        <div className={styles.statValue}>{data.totalLevels}</div>
                    </div>

                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Текущий</div>
                        <div className={styles.statValue}>
                            {data.currentBucketMs ? formatBucketSize(data.currentBucketMs) : '—'}
                        </div>
                    </div>

                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Покрытие</div>
                        <div className={styles.statValue}>{totalCoverage}%</div>
                    </div>

                    {enableDebugLogs && (
                        <button
                            className={styles.debugToggle}
                            onClick={() => setShowDebugInfo(!showDebugInfo)}
                            title="Показать/скрыть отладочную информацию"
                        >
                            🐛
                        </button>
                    )}
                </div>
            </div>

            {/* Отладочная информация */}
            {showDebugInfo && (
                <div className={styles.debugInfo} style={{
                    padding: '10px',
                    background: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    margin: '10px 0',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                }}>
                    <h4>Debug Info:</h4>
                    {data.levels.map(level => (
                        <div key={level.bucketMs} style={{ marginBottom: '8px' }}>
                            <strong>{level.bucketLabel}:</strong>
                            <div style={{ marginLeft: '10px' }}>
                                Tiles: {level.debugInfo?.totalTiles || 0}
                                (R:{level.debugInfo?.readyTiles || 0}
                                L:{level.debugInfo?.loadingTiles || 0}
                                E:{level.debugInfo?.errorTiles || 0})
                                | Points: {level.debugInfo?.totalDataPoints || 0}
                                | Coverage: {level.coveredBins}/{level.totalBins} ({level.coveragePercent}%)
                                {level.isCurrent && ' ← CURRENT'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Тестовые контролы (только если включены) */}
            {enableTestControls && (
                <div className={styles.testControls}>
                    <button
                        className={styles.testButtonPrimary}
                        onClick={handleRunFullTest}
                        disabled={isTestRunning}
                    >
                        {isTestRunning ? '⏳ Тест идет...' : '🚀 Полный тест'}
                    </button>
                    <button
                        className={styles.testButton}
                        onClick={handleInitLevels}
                        disabled={isTestRunning}
                    >
                        📊 Инициализация
                    </button>
                    <button
                        className={styles.testButton}
                        onClick={handleIncrementalLoad}
                        disabled={isTestRunning}
                    >
                        📥 Дозагрузка 80%
                    </button>
                    <button
                        className={styles.testButton}
                        onClick={handlePanTest}
                        disabled={isTestRunning}
                    >
                        ↔️ Панорамирование
                    </button>
                    <button
                        className={styles.testButton}
                        onClick={handleSwitchLevel}
                        disabled={isTestRunning}
                    >
                        🔄 Переключить уровень
                    </button>
                    <button
                        className={styles.testButton}
                        onClick={handleTestErrors}
                        disabled={isTestRunning}
                    >
                        ❌ Тест ошибок
                    </button>
                </div>
            )}

            {/* Ошибка, если есть */}
            {data.fieldError && (
                <div className={styles.error}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span>Ошибка: {data.fieldError}</span>
                </div>
            )}

            {/* Список уровней */}
            {data.domain && (
                <div className={styles.levelsList}>
                    {data.levels.length === 0 ? (
                        <div className={styles.emptyState}>
                            Нет загруженных уровней
                        </div>
                    ) : (
                        data.levels.map(level => (
                            <LevelRow
                                key={level.bucketMs}
                                level={level}
                                domain={data.domain!}
                                showDetails={showDetails}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};