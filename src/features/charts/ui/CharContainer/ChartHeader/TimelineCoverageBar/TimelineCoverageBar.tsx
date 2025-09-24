// TimelineCoverageBar.tsx
import React, { useMemo } from 'react';
import type { CoverageInterval } from '@charts/store/chartsSlice';

export type TimelineCoverageBarProps = {
    // Основные данные
    coverage: CoverageInterval[];      // массив покрытых интервалов
    domainFrom: number;                // начало временной шкалы в ms
    domainTo: number;                  // конец временной шкалы в ms

    // Визуальные настройки
    height?: number;                   // высота полосы
    width?: string | number;           // ширина (100% или px)

    // Цвета для разных состояний
    backgroundColor?: string;          // фон незагруженных участков
    coverageColor?: string;           // цвет загруженных участков
    loadingColor?: string;            // цвет загружаемых участков (опционально)

    // Дополнительные участки в процессе загрузки
    loadingIntervals?: CoverageInterval[];

    // Стиль и поведение
    showTooltip?: boolean;            // показывать подсказку при наведении
    borderRadius?: number;            // скругление углов
    animate?: boolean;                // анимация появления
};

export const TimelineCoverageBar: React.FC<TimelineCoverageBarProps> = ({
                                                                            coverage,
                                                                            domainFrom,
                                                                            domainTo,
                                                                            height = 8,
                                                                            width = '100%',
                                                                            backgroundColor = '#e5e7eb',
                                                                            coverageColor = '#3b82f6',
                                                                            loadingColor = '#9ca3af',
                                                                            loadingIntervals = [],
                                                                            showTooltip = true,
                                                                            borderRadius = 4,
                                                                            animate = true,
                                                                        }) => {
    // Вычисляем сегменты для отрисовки
    const segments = useMemo(() => {
        const span = domainTo - domainFrom;
        if (span <= 0) return { covered: [], loading: [] };

        // Функция для преобразования ms в проценты
        const toPercent = (ms: number) => {
            return ((ms - domainFrom) / span) * 100;
        };

        // Обрабатываем покрытые интервалы
        const covered = coverage
            .map(interval => {
                // Обрезаем интервалы по границам домена
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

        // Обрабатываем загружаемые интервалы
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

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        width,
        height,
        backgroundColor,
        borderRadius,
        overflow: 'hidden',
        transition: animate ? 'all 0.3s ease' : undefined,
    };

    const segmentStyle = (segment: any, color: string, isLoading = false): React.CSSProperties => ({
        position: 'absolute',
        left: `${segment.left}%`,
        width: `${segment.width}%`,
        height: '100%',
        backgroundColor: color,
        opacity: isLoading ? 0.5 : 1,
        transition: animate ? 'all 0.3s ease' : undefined,
        ...(isLoading && {
            animation: 'pulse 2s infinite',
        }),
    });

    const tooltip = (segment: any) => {
        if (!showTooltip) return undefined;
        return `${formatTime(segment.startMs)} - ${formatTime(segment.endMs)}`;
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
                style={containerStyle}
                title={showTooltip ? `Покрытие: ${coveragePercent}%` : undefined}
            >
                {/* Загружаемые сегменты (под покрытыми) */}
                {segments.loading.map((segment, idx) => (
                    <div
                        key={`loading-${idx}`}
                        style={segmentStyle(segment, loadingColor, true)}
                        title={tooltip(segment)}
                    />
                ))}

                {/* Покрытые сегменты */}
                {segments.covered.map((segment, idx) => (
                    <div
                        key={`covered-${idx}`}
                        style={segmentStyle(segment, coverageColor)}
                        title={tooltip(segment)}
                    />
                ))}
            </div>

            {/* Процент покрытия справа */}
            <div
                style={{
                    minWidth: 45,
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#6b7280',
                    fontVariantNumeric: 'tabular-nums'
                }}
            >
                {coveragePercent}%
            </div>

            {/* CSS для анимации пульсации */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                }
            `}</style>
        </div>
    );
};