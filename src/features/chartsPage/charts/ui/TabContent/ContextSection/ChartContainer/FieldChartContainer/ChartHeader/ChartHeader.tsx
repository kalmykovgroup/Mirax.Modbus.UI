// ChartHeader.tsx
import React, { useMemo } from 'react';
import { useAppSelector } from '@/baseStore/hooks.ts';
import type {
    BucketsMs,
    CoverageInterval,
    FieldName, OriginalRange
} from "@/features/chartsPage/charts/core/store/types/chart.types";
import {
    selectFieldOriginalRange,
    selectFieldView
} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import { useSelector } from "react-redux";
import type { RootState } from "@/baseStore/store.ts";
import styles from "./ChartHeader.module.css";
import { LevelRow } from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/FieldChartContainer/ChartHeader/LevelRow/LevelRow.tsx";
import type {Guid} from "@app/lib/types/Guid.ts";

// ============================================
// ТИПЫ
// ============================================

export type HeaderProps = {
    readonly contextId: Guid;
    readonly width: number;
    readonly fieldName: FieldName;
    readonly title?: string | undefined;
    readonly showDetails?: boolean | undefined;
    readonly enableTestControls?: boolean | undefined;
    readonly enableDebugLogs?: boolean | undefined;
};

export type LevelInfo = {
    readonly bucketMs: BucketsMs;
    readonly bucketLabel: string;
    readonly coverage: readonly CoverageInterval[];
    readonly loadingCoverage: readonly CoverageInterval[];
    readonly errorCoverage: readonly CoverageInterval[];
    readonly totalBins: number;
    readonly coveredBins: number;
    readonly coveragePercent: number;
    readonly isCurrent: boolean;
    readonly debugInfo?: {
        readonly totalTiles: number;
        readonly readyTiles: number;
        readonly loadingTiles: number;
        readonly errorTiles: number;
        readonly totalDataPoints: number;
    } | undefined;
};


type HeaderData = {
    readonly levels: readonly LevelInfo[];
    readonly originalRange: OriginalRange | undefined;
    readonly currentBucketMs: BucketsMs | undefined;
    readonly isFieldLoading: boolean;
    readonly fieldError: string | undefined;
    readonly totalLevels: number;
};

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Форматирование размера бакета в человекочитаемый вид
 */
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


// ============================================
// КОМПОНЕНТ
// ============================================

export const ChartHeader: React.FC<HeaderProps> = ({
                                                       contextId,
                                                       width,
                                                       fieldName,
                                                       title,
                                                       showDetails = true
                                                   }) => {
    // ============================================
    // СЕЛЕКТОРЫ
    // ============================================

    const fieldView = useAppSelector(state => selectFieldView(state, contextId, fieldName));
    const originalRange = useSelector((state: RootState) =>
        selectFieldOriginalRange(state, contextId, fieldName)
    );

    // ============================================
    // ВЫЧИСЛЕНИЕ ДАННЫХ ЗАГОЛОВКА
    // ============================================

    const headerData = useMemo((): HeaderData => {
        // 1. Проверка: есть ли fieldView?
        if (!fieldView) {
            console.warn('[ChartHeader] No fieldView for:', fieldName);
            return {
                levels: [],
                originalRange: undefined,
                currentBucketMs: undefined,
                isFieldLoading: false,
                fieldError: undefined,
                totalLevels: 0,
            };
        }

        // 2. Проверка: есть ли originalRange?
        if (!originalRange) {
            console.warn('[ChartHeader] No originalRange for:', fieldName);
            return {
                levels: [],
                originalRange: undefined,
                currentBucketMs: fieldView.currentBucketsMs,
                isFieldLoading: fieldView.loadingState.active,
                fieldError: fieldView.error,
                totalLevels: 0,
            };
        }


        // 4. Проверка: корректен ли диапазон?
        if (originalRange.toMs <= originalRange.fromMs) {
            console.error('[ChartHeader] Invalid originalRange:', originalRange);
            return {
                levels: [],
                originalRange: undefined,
                currentBucketMs: fieldView.currentBucketsMs,
                isFieldLoading: fieldView.loadingState.active,
                fieldError: 'Некорректный диапазон дат',
                totalLevels: 0,
            };
        }

        // 5. Получаем все bucket-уровни из seriesLevel
        const bucketMsList = Object.keys(fieldView.seriesLevel)
            .map(k => Number(k))
            .filter(b => Number.isFinite(b) && b > 0)
            .sort((a, b) => b - a); // От большого к малому

        // 6. Если нет уровней, возвращаем раньше
        if (bucketMsList.length === 0) {
            console.warn('[ChartHeader] No bucket levels found for:', fieldName);
            return {
                levels: [],
                originalRange: originalRange,
                currentBucketMs: fieldView.currentBucketsMs,
                isFieldLoading: fieldView.loadingState.active,
                fieldError: fieldView.error,
                totalLevels: 0,
            };
        }

        // 7. Обрабатываем каждый уровень
        const levels: LevelInfo[] = [];

        bucketMsList.forEach(bucketMs => {
            const tiles = fieldView.seriesLevel[bucketMs];

            // Проверка: есть ли tiles для этого bucket?
            if (!tiles) {
                console.warn('[ChartHeader] No tiles for bucket:', bucketMs);
                return; // Пропускаем этот уровень
            }

            // Фильтруем tiles по статусу
            const readyTiles = tiles.filter(t => t.status === 'ready');
            const loadingTiles = tiles.filter(t => t.status === 'loading');
            const errorTiles = tiles.filter(t => t.status === 'error');

            // Считаем общее количество точек данных
            const totalDataPoints = readyTiles.reduce(
                (sum, tile) => sum + (tile.bins?.length ?? 0),
                0
            );

            // Извлекаем интервалы покрытия
            const coverage = readyTiles.map(t => t.coverageInterval);
            const loadingCoverage = loadingTiles.map(t => t.coverageInterval);
            const errorCoverage = errorTiles.map(t => t.coverageInterval);

            // Вычисляем статистику покрытия
            const totalMs = originalRange.toMs - originalRange.fromMs;
            const totalBins = Math.ceil(totalMs / bucketMs);

            let coveredMs = 0;
            coverage.forEach(interval => {
                const start = Math.max(interval.fromMs, originalRange.fromMs);
                const end = Math.min(interval.toMs, originalRange.toMs);
                if (end > start) {
                    coveredMs += (end - start);
                }
            });

            const coveredBins = Math.floor(coveredMs / bucketMs);
            const coveragePercent = totalMs > 0
                ? Math.round((coveredMs / totalMs) * 100)
                : 0;

            // Проверяем, является ли этот уровень текущим
            const isCurrent = bucketMs === fieldView.currentBucketsMs;

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
            originalRange: originalRange,
            currentBucketMs: fieldView.currentBucketsMs,
            isFieldLoading: fieldView.loadingState.active,
            fieldError: fieldView.error,
            totalLevels: levels.length,
        };
    }, [fieldView, originalRange, fieldName]);

    // ============================================
    // ОБЩАЯ СТАТИСТИКА
    // ============================================

    const totalCoverage = useMemo(() => {
        if (headerData.levels.length === 0) return 0;

        const levelsWithData = headerData.levels.filter(level =>
            level.debugInfo && level.debugInfo.totalTiles > 0
        );

        if (levelsWithData.length === 0) return 0;

        const sum = levelsWithData.reduce(
            (acc, level) => acc + level.coveragePercent,
            0
        );
        return Math.round(sum / levelsWithData.length);
    }, [headerData.levels]);

    // ============================================
    // РЕНДЕРИНГ
    // ============================================

    return (
        <div className={styles.container}>
            {/* Заголовок с общей статистикой */}
            <div className={styles.header}>
                <div className={styles.title}>
                    {title ?? fieldName}
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
                            {headerData.currentBucketMs
                                ? formatBucketSize(headerData.currentBucketMs)
                                : '—'}
                        </div>
                    </div>

                    <div className={styles.statItem}>
                        <div className={styles.statLabel}>Покрытие</div>
                        <div className={styles.statValue}>{totalCoverage}%</div>
                    </div>
                </div>
            </div>

            {/* Ошибка */}
            {headerData.fieldError && (
                <div className={styles.error}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span>Ошибка: {headerData.fieldError}</span>
                </div>
            )}

            {/* Список уровней */}
            {headerData.originalRange ? (
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
                                fieldName={fieldName}
                                width={width}
                                originalRange={headerData.originalRange!}
                                showDetails={showDetails}
                            />
                        ))
                    )}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    Диапазон дат не определён
                </div>
            )}
        </div>
    );
};