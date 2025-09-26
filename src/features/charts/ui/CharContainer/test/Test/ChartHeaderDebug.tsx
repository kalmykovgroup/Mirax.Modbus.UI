// ChartHeaderDebug.tsx - Отладочная версия для понимания проблемы с подсчетом
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';

interface Props {
    fieldName: string;
    title?: string;
}

export const ChartHeaderDebug: React.FC<Props> = ({ fieldName, title }) => {
    const debugInfo = useSelector((state: RootState) => {
        const fieldView = state.charts.view[fieldName];
        if (!fieldView) return null;

        const currentBucketMs = fieldView.currentBucketsMs;
        const assembly = fieldView.seriesLevel[currentBucketMs]?.[0];

        if (!assembly) return null;

        // Считаем бины разными способами
        const allBinsFromTiles: any[] = [];
        const validBinsFromTiles: any[] = [];

        assembly.tiles.forEach((tile: any) => {
            if (tile.status === 'ready' && tile.bins) {
                tile.bins.forEach((bin: any) => {
                    allBinsFromTiles.push(bin);
                    if (bin.avg !== null && bin.avg !== undefined) {
                        validBinsFromTiles.push(bin);
                    }
                });
            }
        });

        // Убираем дубликаты по времени
        const uniqueAllBins = new Map();
        const uniqueValidBins = new Map();

        allBinsFromTiles.forEach(bin => {
            const key = new Date(bin.t).getTime();
            uniqueAllBins.set(key, bin);
        });

        validBinsFromTiles.forEach(bin => {
            const key = new Date(bin.t).getTime();
            uniqueValidBins.set(key, bin);
        });

        return {
            fieldName,
            currentBucketMs,
            tiles: assembly.tiles.map((t: any) => ({
                status: t.status,
                binsCount: t.bins?.length || 0,
                fromMs: t.coverageInterval.fromMs,
                toMs: t.coverageInterval.toMs,
            })),
            stats: {
                всего_тайлов: assembly.tiles.length,
                готовых_тайлов: assembly.tiles.filter((t: any) => t.status === 'ready').length,
                всего_бинов_в_тайлах: allBinsFromTiles.length,
                уникальных_бинов: uniqueAllBins.size,
                валидных_бинов: uniqueValidBins.size,
                процент_валидных: uniqueAllBins.size > 0
                    ? Math.round((uniqueValidBins.size / uniqueAllBins.size) * 100)
                    : 0,
            }
        };
    });

    if (!debugInfo) {
        return <div>No data for {fieldName}</div>;
    }

    return (
        <div style={{
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '12px',
            fontFamily: 'monospace',
            fontSize: '12px'
        }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                Debug: {title || fieldName}
            </h3>

            <div style={{ marginBottom: '8px' }}>
                <strong>Текущий бакет:</strong> {Math.round(debugInfo.currentBucketMs / 1000)}с
            </div>

            <div style={{ marginBottom: '8px' }}>
                <strong>Статистика:</strong>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    <li>Тайлов: {debugInfo.stats.всего_тайлов} (готовых: {debugInfo.stats.готовых_тайлов})</li>
                    <li>Всего бинов в тайлах: {debugInfo.stats.всего_бинов_в_тайлах}</li>
                    <li>Уникальных бинов: {debugInfo.stats.уникальных_бинов}</li>
                    <li>Валидных (с avg): {debugInfo.stats.валидных_бинов} ({debugInfo.stats.процент_валидных}%)</li>
                </ul>
            </div>

            <details>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                    Детали тайлов ({debugInfo.tiles.length})
                </summary>
                <div style={{ marginLeft: '12px', fontSize: '11px' }}>
                    {debugInfo.tiles.map((tile, i) => (
                        <div key={i} style={{
                            padding: '4px',
                            margin: '2px 0',
                            background: tile.status === 'ready' ? '#d4edda' : '#f8d7da',
                            borderRadius: '4px'
                        }}>
                            Тайл {i}: {tile.status} | Бинов: {tile.binsCount} |
                            {' '}{new Date(tile.fromMs).toLocaleTimeString()} - {new Date(tile.toMs).toLocaleTimeString()}
                        </div>
                    ))}
                </div>
            </details>
        </div>
    );
};

export default ChartHeaderDebug;