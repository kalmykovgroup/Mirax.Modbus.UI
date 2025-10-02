// ChartHeader.tsx
import React, { useMemo, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { FieldName, BucketsMs, CoverageInterval, SeriesTile } from '@chartsPage/store/chartsSlice';
import {
    selectFieldView,
    selectTemplateDomain,
} from '@chartsPage/store/selectors';
import {
    runFullTestSuite,
    testInitializeMultipleLevels,
    testIncrementalLoad,
    testSwitchLevel,
    testLoadingErrors,
    testPanNavigation
} from '@chartsPage/store/thunks.test';
import styles from './ChartHeader.module.css';
import {
    LevelRow
} from "@chartsPage/ui/CharContainer/ChartCollection/FieldChart/ViewFieldChart/ChartHeader/LevelRow/LevelRow.tsx";

export type HeaderProps = {
    fieldName: FieldName;
    title?: string | undefined;
    showDetails?: boolean | undefined;
    enableTestControls?: boolean | undefined;
    enableDebugLogs?: boolean | undefined;
};

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
    debugInfo?: {
        totalTiles: number;
        readyTiles: number;
        loadingTiles: number;
        errorTiles: number;
        totalDataPoints: number;
    } | undefined;
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

export const ChartHeader: React.FC<HeaderProps> = ({
                                                       fieldName,
                                                       title,
                                                       showDetails = true,
                                                       enableTestControls = true,
                                                       enableDebugLogs = false
                                                   }) => {
    const dispatch = useAppDispatch();
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [showDebugInfo, setShowDebugInfo] = useState(false);

    // Получаем данные напрямую из store
    const fieldView = useAppSelector(state => selectFieldView(state, fieldName));
    const templateDomain = useAppSelector(selectTemplateDomain);

    // Вычисляем все необходимые данные из view
    const headerData = useMemo(() => {
        const levels: LevelInfo[] = [];

        if (!fieldView) {
            return {
                levels: [],
                domain: templateDomain ? {
                    from: templateDomain.from.getTime(),
                    to: templateDomain.to.getTime()
                } : null,
                currentBucketMs: undefined,
                isFieldLoading: false,
                fieldError: undefined,
                totalLevels: 0,
            };
        }

        const domain = templateDomain ? {
            from: templateDomain.from.getTime(),
            to: templateDomain.to.getTime()
        } : null;

        if (!domain) {
            return {
                levels: [],
                domain: null,
                currentBucketMs: fieldView.currentBucketsMs,
                isFieldLoading: fieldView.loadingState.active,
                fieldError: fieldView.error,
                totalLevels: 0,
            };
        }

        // Получаем все уровни из seriesLevel
        const bucketMsList = Object.keys(fieldView.seriesLevel)
            .map(k => Number(k))
            .filter(b => Number.isFinite(b) && b > 0)
            .sort((a, b) => b - a);

        if (enableDebugLogs) {
            console.log(`[ChartHeader] Field: ${fieldName}`);
            console.log('Current bucket from view:', fieldView.currentBucketsMs);
            console.log('Available levels:', bucketMsList);
        }

        // Обрабатываем каждый уровень
        bucketMsList.forEach(bucketMs => {
            const tiles = fieldView.seriesLevel[bucketMs] || [];

            const readyTiles = tiles.filter((t: SeriesTile) => t.status === 'ready');
            const loadingTiles = tiles.filter((t: SeriesTile) => t.status === 'loading');
            const errorTiles = tiles.filter((t: SeriesTile) => t.status === 'error');

            const totalDataPoints = readyTiles.reduce((sum: number, tile: SeriesTile) =>
                sum + (tile.bins?.length || 0), 0
            );

            const coverage = readyTiles.map((t: SeriesTile) => t.coverageInterval);
            const loadingCoverage = loadingTiles.map((t: SeriesTile) => t.coverageInterval);
            const errorCoverage = errorTiles.map((t: SeriesTile) => t.coverageInterval);

            // Вычисляем статистику покрытия
            const totalMs = domain.to - domain.from;
            const totalBins = Math.ceil(totalMs / bucketMs);

            let coveredMs = 0;
            coverage.forEach(interval => {
                const start = Math.max(interval.fromMs, domain.from);
                const end = Math.min(interval.toMs, domain.to);
                if (end > start) {
                    coveredMs += (end - start);
                }
            });

            const coveredBins = Math.floor(coveredMs / bucketMs);
            const coveragePercent = totalBins > 0
                ? Math.round((coveredMs / totalMs) * 100)
                : 0;

            // Проверяем, является ли этот уровень текущим
            const isCurrent = bucketMs === fieldView.currentBucketsMs;

            if (enableDebugLogs && isCurrent) {
                console.log(`[ChartHeader] Current level ${formatBucketSize(bucketMs)}:`, {
                    tiles: tiles.length,
                    ready: readyTiles.length,
                    loading: loadingTiles.length,
                    error: errorTiles.length,
                    points: totalDataPoints,
                    coverage: `${coveragePercent}%`
                });
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
                isCurrent,
                debugInfo: {
                    totalTiles: tiles.length,
                    readyTiles: readyTiles.length,
                    loadingTiles: loadingTiles.length,
                    errorTiles: errorTiles.length,
                    totalDataPoints
                }
            });
        });

        return {
            levels,
            domain,
            currentBucketMs: fieldView.currentBucketsMs,
            isFieldLoading: fieldView.loadingState.active,
            fieldError: fieldView.error,
            totalLevels: levels.length,
        };
    }, [fieldView, templateDomain, fieldName, enableDebugLogs]);

    // Считаем общую статистику
    const totalCoverage = useMemo(() => {
        if (!headerData.levels.length) return 0;

        const levelsWithData = headerData.levels.filter(level =>
            level.debugInfo && level.debugInfo.totalTiles > 0
        );

        if (levelsWithData.length === 0) return 0;

        const sum = levelsWithData.reduce((acc, level) => acc + level.coveragePercent, 0);
        return Math.round(sum / levelsWithData.length);
    }, [headerData.levels]);

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
                    {headerData.isFieldLoading && (
                        <span className={styles.loadingIndicator}>
                            (загрузка...)
                        </span>
                    )}
                </div>

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Уровни</div>
                        <div className={styles.statValue}>{headerData.totalLevels}</div>
                    </div>

                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Текущий</div>
                        <div className={styles.statValue}>
                            {headerData.currentBucketMs ? formatBucketSize(headerData.currentBucketMs) : '—'}
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
                            🛠
                        </button>
                    )}
                </div>
            </div>

            {/* Отладочная информация */}
            {showDebugInfo && (
                <div className={styles.debugInfo}>
                    <h4>Debug Info:</h4>
                    <div>Current bucket (from view): {headerData.currentBucketMs}</div>
                    <div>Loading: {headerData.isFieldLoading ? 'Yes' : 'No'}</div>
                    <div>Error: {headerData.fieldError || 'None'}</div>
                    {headerData.levels.map(level => (
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

            {/* Тестовые контролы */}
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

            {/* Ошибка */}
            {headerData.fieldError && (
                <div className={styles.error}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span>Ошибка: {headerData.fieldError}</span>
                </div>
            )}

            {/* Список уровней */}
            {headerData.domain && (
                <div className={styles.levelsList}>
                    {headerData.levels.length === 0 ? (
                        <div className={styles.emptyState}>
                            Нет загруженных уровней
                        </div>
                    ) : (
                        headerData.levels.map(level => (
                            <LevelRow
                                key={level.bucketMs}
                                level={level}
                                domain={headerData.domain!}
                                showDetails={showDetails}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};