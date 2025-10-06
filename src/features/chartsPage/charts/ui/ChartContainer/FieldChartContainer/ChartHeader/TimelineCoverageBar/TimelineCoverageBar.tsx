// TimelineCoverageBar.tsx
import React, { useMemo } from 'react';
import styles from './TimelineCoverageBar.module.css';
import classNames from 'classnames';
import type { CoverageInterval } from "@chartsPage/charts/core/store/types/chart.types.ts";

// ============================================
// ТИПЫ
// ============================================

export type TimelineCoverageBarProps = {
    // Основные данные
    readonly coverage: readonly CoverageInterval[];
    readonly domainFrom: number;
    readonly domainTo: number;

    // Цвета для разных состояний
    readonly backgroundColor?: string | undefined;
    readonly coverageColor?: string | undefined;
    readonly loadingColor?: string | undefined;

    // Дополнительные участки в процессе загрузки
    readonly loadingIntervals?: readonly CoverageInterval[] | undefined;

    // Стиль и поведение
    readonly showTooltip?: boolean | undefined;
    readonly animate?: boolean | undefined;
    readonly showPercent?: boolean | undefined;
    readonly className?: string | undefined;
};

type Segment = {
    readonly left: number;
    readonly width: number;
    readonly startMs: number;
    readonly endMs: number;
};

type Segments = {
    readonly covered: readonly Segment[];
    readonly loading: readonly Segment[];
};

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Форматирование timestamp в человекочитаемый вид
 */
function formatTime(ms: number): string {
    const date = new Date(ms);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Конвертация интервала в процентную позицию на шкале
 */
function intervalToSegment(
    interval: CoverageInterval,
    domainFrom: number,
    domainTo: number
): Segment | null {
    const span = domainTo - domainFrom;
    if (span <= 0) return null;

    const start = Math.max(interval.fromMs, domainFrom);
    const end = Math.min(interval.toMs, domainTo);

    if (start >= end) return null;

    const toPercent = (ms: number) => ((ms - domainFrom) / span) * 100;

    return {
        left: toPercent(start),
        width: toPercent(end) - toPercent(start),
        startMs: start,
        endMs: end,
    };
}

// ============================================
// КОМПОНЕНТ
// ============================================

export const TimelineCoverageBar: React.FC<TimelineCoverageBarProps> = ({
                                                                            coverage,
                                                                            domainFrom,
                                                                            domainTo,
                                                                            backgroundColor = '#e5e7eb',
                                                                            coverageColor = '#3b82f6',
                                                                            loadingColor = '#fbbf24',
                                                                            loadingIntervals = [],
                                                                            showTooltip = true,
                                                                            animate = true,
                                                                            showPercent = true,
                                                                            className,
                                                                        }) => {
    // ============================================
    // ВЫЧИСЛЕНИЕ СЕГМЕНТОВ
    // ============================================

    const segments = useMemo((): Segments => {
        const span = domainTo - domainFrom;

        // Проверка корректности диапазона
        if (span <= 0) {
            console.warn('[TimelineCoverageBar] Invalid domain range:', {
                domainFrom,
                domainTo,
                span
            });
            return { covered: [], loading: [] };
        }

        // Конвертируем покрытые интервалы в сегменты
        const covered = coverage
            .map(interval => intervalToSegment(interval, domainFrom, domainTo))
            .filter((segment): segment is Segment => segment !== null);

        // Конвертируем загружаемые интервалы в сегменты
        const loading = loadingIntervals
            .map(interval => intervalToSegment(interval, domainFrom, domainTo))
            .filter((segment): segment is Segment => segment !== null);

        return { covered, loading };
    }, [coverage, loadingIntervals, domainFrom, domainTo]);

    // ============================================
    // ВЫЧИСЛЕНИЕ ПРОЦЕНТА ПОКРЫТИЯ
    // ============================================

    const coveragePercent = useMemo((): number => {
        const span = domainTo - domainFrom;
        if (span <= 0) return 0;

        let totalCovered = 0;

        coverage.forEach(interval => {
            const start = Math.max(interval.fromMs, domainFrom);
            const end = Math.min(interval.toMs, domainTo);
            if (end > start) {
                totalCovered += (end - start);
            }
        });

        return Math.round((totalCovered / span) * 100);
    }, [coverage, domainFrom, domainTo]);

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================

    /**
     * Генерация tooltip для сегмента
     */
    const getSegmentTooltip = (segment: Segment): string | undefined => {
        if (!showTooltip) return undefined;
        return `${formatTime(segment.startMs)} — ${formatTime(segment.endMs)}`;
    };

    /**
     * Стили для позиционирования сегмента
     */
    const getSegmentStyle = (segment: Segment, color: string): React.CSSProperties => ({
        left: `${segment.left}%`,
        width: `${segment.width}%`,
        backgroundColor: color,
    });

    // ============================================
    // CSS-КЛАССЫ
    // ============================================

    const containerClassName = classNames(
        animate ? styles.container : styles.containerNoAnimation,
        styles.progress,
        className
    );

    const getSegmentClassName = (type: 'covered' | 'loading') => classNames(
        animate ? styles.segment : styles.segmentNoAnimation,
        type === 'covered' ? styles.segmentCovered : styles.segmentLoading
    );

    // ============================================
    // РЕНДЕРИНГ
    // ============================================

    return (
        <div className={styles.wrapper}>
            {/* Основной контейнер шкалы */}
            <div
                className={containerClassName}
                style={{ backgroundColor }}
                title={showTooltip ? `Покрытие: ${coveragePercent}%` : undefined}
            >
                {/* Загружаемые сегменты (рендерятся первыми, под покрытыми) */}
                {segments.loading.map((segment, idx) => (
                    <div
                        key={`loading-${segment.startMs}-${segment.endMs}-${idx}`}
                        className={getSegmentClassName('loading')}
                        style={getSegmentStyle(segment, loadingColor)}
                        title={getSegmentTooltip(segment)}
                        aria-label={`Загрузка: ${formatTime(segment.startMs)} — ${formatTime(segment.endMs)}`}
                    />
                ))}

                {/* Покрытые сегменты (рендерятся поверх загружаемых) */}
                {segments.covered.map((segment, idx) => (
                    <div
                        key={`covered-${segment.startMs}-${segment.endMs}-${idx}`}
                        className={getSegmentClassName('covered')}
                        style={getSegmentStyle(segment, coverageColor)}
                        title={getSegmentTooltip(segment)}
                        aria-label={`Покрыто: ${formatTime(segment.startMs)} — ${formatTime(segment.endMs)}`}
                    />
                ))}
            </div>

            {/* Процент покрытия справа */}
            {showPercent && (
                <div
                    className={styles.coveragePercent}
                    aria-label={`Процент покрытия: ${coveragePercent}%`}
                >
                    {coveragePercent}%
                </div>
            )}
        </div>
    );
};