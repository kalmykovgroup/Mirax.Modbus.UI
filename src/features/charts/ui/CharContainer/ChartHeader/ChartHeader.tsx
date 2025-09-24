// Header.tsx
import React, { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { createSelector } from '@reduxjs/toolkit';
import type { FieldName, BucketsMs, CoverageInterval } from '@charts/store/chartsSlice';
import {
    selectSeriesLevelMap,
    selectTemplateDomain,
    selectCurrentBucketMs,
    selectFieldLoading,
    selectFieldError,
} from '@charts/store/selectors';
import { TimelineCoverageBar } from './TimelineCoverageBar';

export type HeaderProps = {
    fieldName: FieldName;
    title?: string;
    showDetails?: boolean;
};

// Типы для внутреннего представления
type LevelInfo = {
    bucketMs: BucketsMs;
    bucketLabel: string;
    coverage: CoverageInterval[];
    loadingCoverage: CoverageInterval[];
    errorCoverage: CoverageInterval[];
    totalBins: number;
    coveredBins: number;
    coveragePercent: number;
    isCurrent: boolean;
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

// Компонент для отображения одного уровня
const LevelRow: React.FC<{
    level: LevelInfo;
    domain: { from: number; to: number };
    showDetails?: boolean;
}> = ({ level, domain, showDetails = true }) => {
    const rowStyle: React.CSSProperties = {
        padding: '12px',
        borderRadius: 8,
        backgroundColor: level.isCurrent ? '#eff6ff' : '#f9fafb',
        border: level.isCurrent ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        display: 'grid',
        gap: 8,
    };

    const headerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 12,
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 14,
        fontWeight: 600,
        color: level.isCurrent ? '#1e40af' : '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    };

    return (
        <div style={rowStyle}>
            <div style={headerStyle}>
                {/* Метка уровня */}
                <div style={labelStyle}>
                    {level.isCurrent && (
                        <span style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            animation: 'pulse 2s infinite',
                        }} />
                    )}
                    Уровень: {level.bucketLabel}
                </div>

                {/* Статистика */}
                {showDetails && (
                    <div style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: '#6b7280',
                    }}>
                        {level.coveredBins} из {level.totalBins} бинов
                    </div>
                )}

                {/* Текущий индикатор */}
                {level.isCurrent && (
                    <div style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        borderRadius: 4,
                        fontWeight: 500,
                    }}>
                        ТЕКУЩИЙ
                    </div>
                )}
            </div>

            {/* Визуализация покрытия */}
            <TimelineCoverageBar
                coverage={level.coverage}
                loadingIntervals={level.loadingCoverage}
                domainFrom={domain.from}
                domainTo={domain.to}
                height={level.isCurrent ? 12 : 10}
                coverageColor={level.isCurrent ? '#3b82f6' : '#10b981'}
                loadingColor="#fbbf24"
                backgroundColor={level.errorCoverage.length > 0 ? '#fee2e2' : '#e5e7eb'}
            />
        </div>
    );
};

// Основной компонент Header
export const ChartHeader: React.FC<HeaderProps> = ({
                                                  fieldName,
                                                  title,
                                                  showDetails = true
                                              }) => {
    // Создаем мемоизированный селектор для всех данных
    const dataSelector = useMemo(
        () => createSelector(
            selectSeriesLevelMap(fieldName),
            selectTemplateDomain,
            selectCurrentBucketMs(fieldName),
            selectFieldLoading(fieldName),
            selectFieldError(fieldName),
            (levelMap, domain, currentBucketMs, isLoading, error): HeaderData => {
                const levels: LevelInfo[] = [];

                if (!domain) {
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

                // Получаем все уровни и сортируем по размеру бакета (от большего к меньшему)
                const bucketMsList = Object.keys(levelMap ?? {})
                    .map(k => Number(k) as BucketsMs)
                    .filter(b => Number.isFinite(b) && b > 0)
                    .sort((a, b) => b - a);

                // Обрабатываем каждый уровень
                bucketMsList.forEach(bucketMs => {
                    const assembly = levelMap[bucketMs]?.[0];
                    if (!assembly) return;

                    const tiles = assembly.tiles ?? [];

                    // Разделяем тайлы по статусам
                    const readyTiles = tiles.filter(t => t.status === 'ready');
                    const loadingTiles = tiles.filter(t => t.status === 'loading');
                    const errorTiles = tiles.filter(t => t.status === 'error');

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
                            coveredMs += (end - start);
                        }
                    });

                    const coveredBins = Math.floor(coveredMs / bucketMs);
                    const coveragePercent = totalBins > 0
                        ? Math.round((coveredBins / totalBins) * 100)
                        : 0;

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
                    });
                });

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
        [fieldName]
    );

    // Получаем данные
    const data = useAppSelector(dataSelector);

    // Стили контейнера
    const containerStyle: React.CSSProperties = {
        display: 'grid',
        gap: 16,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    };

    const headerStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #e5e7eb',
    };

    const titleStyle: React.CSSProperties = {
        fontSize: 18,
        fontWeight: 700,
        color: '#111827',
    };

    const statsStyle: React.CSSProperties = {
        display: 'flex',
        gap: 16,
        alignItems: 'center',
    };

    const statItemStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
    };

    const statLabelStyle: React.CSSProperties = {
        fontSize: 11,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    };

    const statValueStyle: React.CSSProperties = {
        fontSize: 20,
        fontWeight: 600,
        color: '#1f2937',
        fontVariantNumeric: 'tabular-nums',
    };

    // Считаем общую статистику
    const totalCoverage = useMemo(() => {
        if (!data.levels.length) return 0;
        const sum = data.levels.reduce((acc, level) => acc + level.coveragePercent, 0);
        return Math.round(sum / data.levels.length);
    }, [data.levels]);

    return (
        <div style={containerStyle}>
            {/* Заголовок с общей статистикой */}
            <div style={headerStyle}>
                <div style={titleStyle}>
                    {title || fieldName}
                    {data.isFieldLoading && (
                        <span style={{
                            marginLeft: 8,
                            fontSize: 12,
                            color: '#6b7280',
                            fontWeight: 400,
                        }}>
                            (загрузка...)
                        </span>
                    )}
                </div>

                <div style={statsStyle}>
                    <div style={statItemStyle}>
                        <div style={statLabelStyle}>Уровни</div>
                        <div style={statValueStyle}>{data.totalLevels}</div>
                    </div>

                    <div style={statItemStyle}>
                        <div style={statLabelStyle}>Текущий</div>
                        <div style={statValueStyle}>
                            {data.currentBucketMs ? formatBucketSize(data.currentBucketMs) : '—'}
                        </div>
                    </div>

                    <div style={statItemStyle}>
                        <div style={statLabelStyle}>Покрытие</div>
                        <div style={statValueStyle}>{totalCoverage}%</div>
                    </div>
                </div>
            </div>

            {/* Ошибка, если есть */}
            {data.fieldError && (
                <div style={{
                    padding: 12,
                    backgroundColor: '#fee2e2',
                    borderRadius: 6,
                    color: '#991b1b',
                    fontSize: 14,
                }}>
                    ⚠️ Ошибка: {data.fieldError}
                </div>
            )}

            {/* Список уровней */}
            {data.domain && (
                <div style={{ display: 'grid', gap: 8 }}>
                    {data.levels.length === 0 ? (
                        <div style={{
                            padding: 24,
                            textAlign: 'center',
                            color: '#9ca3af',
                            fontSize: 14,
                        }}>
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

            {/* CSS для анимации */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};