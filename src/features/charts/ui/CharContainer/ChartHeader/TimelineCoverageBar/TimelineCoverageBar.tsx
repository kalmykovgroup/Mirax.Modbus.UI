import React, { useMemo } from 'react';
import type { CoverageInterval } from '@charts/store/chartsSlice.ts';
import styles from './TimelineCoverageBar.module.css';
import classNames from 'classnames';

export type TimelineCoverageBarProps = {
    // Основные данные
    coverage: CoverageInterval[];
    domainFrom: number;
    domainTo: number;


    // Цвета для разных состояний
    backgroundColor?: string | undefined;
    coverageColor?: string | undefined;
    loadingColor?: string | undefined;

    // Дополнительные участки в процессе загрузки
    loadingIntervals?: CoverageInterval[] | undefined;

    // Стиль и поведение
    showTooltip?: boolean | undefined;
    animate?: boolean | undefined;
    showPercent?: boolean | undefined;            // показывать процент справа
    className?: string | undefined;               // дополнительные классы
};

export const TimelineCoverageBar: React.FC<TimelineCoverageBarProps> = ({
                                                                            coverage,
                                                                            domainFrom,
                                                                            domainTo,
                                                                            backgroundColor = '#e5e7eb',
                                                                            coverageColor = '#3b82f6',
                                                                            loadingColor = '#9ca3af',
                                                                            loadingIntervals = [],
                                                                            showTooltip = true,
                                                                            animate = true,
                                                                            showPercent = true,
                                                                            className,
                                                                        }) => {
    // Вычисляем сегменты для отрисовки
    const segments = useMemo(() => {
        const span = domainTo - domainFrom;
        if (span <= 0) return { covered: [], loading: [] };

        const toPercent = (ms: number) => {
            return ((ms - domainFrom) / span) * 100;
        };

        const covered = coverage
            .map(interval => {
                const start = Math.max(interval.fromMs, domainFrom);
                const end = Math.min(interval.toMs, domainTo);

                if (start >= end) return null;

                return {
                    left: toPercent(start),
                    width: toPercent(end) - toPercent(start),
                    startMs: start,
                    endMs: end,
                };
            })
            .filter(Boolean);

        const loading = loadingIntervals
            .map(interval => {
                const start = Math.max(interval.fromMs, domainFrom);
                const end = Math.min(interval.toMs, domainTo);

                if (start >= end) return null;

                return {
                    left: toPercent(start),
                    width: toPercent(end) - toPercent(start),
                    startMs: start,
                    endMs: end,
                };
            })
            .filter(Boolean);

        return { covered, loading };
    }, [coverage, loadingIntervals, domainFrom, domainTo]);

    // Форматирование времени для tooltip
    const formatTime = (ms: number) => {
        const date = new Date(ms);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Вычисляем процент покрытия
    const coveragePercent = useMemo(() => {
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

    const tooltip = (segment: any) => {
        if (!showTooltip) return undefined;
        return `${formatTime(segment.startMs)} - ${formatTime(segment.endMs)}`;
    };

    // Выбираем класс для контейнера
    const containerClassName = classNames(
        animate ? styles.container : styles.containerNoAnimation,
        className
    );


    // Функция для получения стилей сегмента
    const getSegmentStyle = (segment: any): React.CSSProperties => ({
        left: `${segment.left}%`,
        width: `${segment.width}%`,
    });

    return (
        <div className={styles.wrapper}>
            <div
                className={classNames(containerClassName, styles.progress)}
                style={{
                    backgroundColor,
                }}
                title={showTooltip ? `Покрытие: ${coveragePercent}%` : undefined}
            >
                {/* Загружаемые сегменты */}
                {segments.loading.map((segment, idx) => (
                    <div
                        key={`loading-${idx}`}
                        className={classNames(
                            animate ? styles.segment : styles.segmentNoAnimation,
                            styles.segmentLoading
                        )}
                        style={{
                            ...getSegmentStyle(segment),
                            backgroundColor: loadingColor,
                        }}
                        title={tooltip(segment)}
                    />
                ))}

                {/* Покрытые сегменты */}
                {segments.covered.map((segment, idx) => (
                    <div
                        key={`covered-${idx}`}
                        className={classNames(
                            animate ? styles.segment : styles.segmentNoAnimation,
                            styles.segmentCovered
                        )}
                        style={{
                            ...getSegmentStyle(segment),
                            backgroundColor: coverageColor,
                        }}
                        title={tooltip(segment)}
                    />
                ))}
            </div>

            {/* Процент покрытия справа */}
            {showPercent && (
                <div className={styles.coveragePercent}>
                    {coveragePercent}%
                </div>
            )}
        </div>
    );
};