// src/features/chartsPage/charts/utils/chartDataExport.ts
import * as XLSX from 'xlsx';
import type { EChartsPoint } from '@chartsPage/charts/core/store/selectors/visualization.selectors';

/**
 * Точка для экспорта с читаемой датой
 */
export interface ExportDataPoint {
    readonly timestamp: number;
    readonly isoDate: string;
    readonly value: number | null;
    readonly count: number;
}

/**
 * Метаданные экспорта
 */
export interface ExportMetadata {
    readonly fieldName: string;
    readonly contextId: string;
    readonly exportDate: string;
    readonly totalPoints: number;
    readonly bucketMs?: number | undefined;
    readonly dataQuality?: string | undefined;
}

/**
 * Форматы экспорта
 */
export type ExportFormat = 'excel' | 'txt' | 'csv';

/**
 * Конвертирует EChartsPoint[] в массив для экспорта
 */
export function convertEChartsPointsToExport(
    points: readonly EChartsPoint[],
): ReadonlyArray<ExportDataPoint> {
    return points.map(([timestamp, value, count]) => ({
        timestamp,
        isoDate: new Date(timestamp).toISOString(),
        value: Number.isFinite(value) ? value : null,
        count,
    }));
}

/**
 * Форматирует число для текстового вывода с максимальной точностью
 */
function formatNumberForText(value: number | null): string {
    if (value === null) return 'null';

    const str = value.toString();

    if (str.includes('e') || str.includes('E')) {
        return str;
    }

    return str;
}

/**
 * Экспорт в Excel (.xlsx)
 */
export function exportToExcel(
    avgPoints: readonly EChartsPoint[],
    minPoints: readonly EChartsPoint[],
    maxPoints: readonly EChartsPoint[],
    metadata: ExportMetadata,
): void {
    const metaRows: Array<{ Property: string; Value: string | number }> = [
        { Property: 'Field Name', Value: metadata.fieldName },
        { Property: 'Context ID', Value: metadata.contextId },
        { Property: 'Export Date', Value: metadata.exportDate },
        { Property: 'Total Points', Value: metadata.totalPoints },
    ];

    if (metadata.bucketMs !== undefined) {
        metaRows.push({ Property: 'Bucket (ms)', Value: metadata.bucketMs });
    }

    if (metadata.dataQuality !== undefined) {
        metaRows.push({ Property: 'Data Quality', Value: metadata.dataQuality });
    }

    const metaSheet = XLSX.utils.json_to_sheet(metaRows);

    const avgData = convertEChartsPointsToExport(avgPoints);
    const avgSheet = XLSX.utils.json_to_sheet(
        avgData.map((p) => ({
            'Timestamp (ms)': p.timestamp,
            'ISO Date': p.isoDate,
            'Value': p.value,
            'Count': p.count,
        })),
    );

    const minData = convertEChartsPointsToExport(minPoints);
    const minSheet = XLSX.utils.json_to_sheet(
        minData.map((p) => ({
            'Timestamp (ms)': p.timestamp,
            'ISO Date': p.isoDate,
            'Value': p.value,
            'Count': p.count,
        })),
    );

    const maxData = convertEChartsPointsToExport(maxPoints);
    const maxSheet = XLSX.utils.json_to_sheet(
        maxData.map((p) => ({
            'Timestamp (ms)': p.timestamp,
            'ISO Date': p.isoDate,
            'Value': p.value,
            'Count': p.count,
        })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');
    XLSX.utils.book_append_sheet(workbook, avgSheet, 'AVG');

    if (minPoints.length > 0) {
        XLSX.utils.book_append_sheet(workbook, minSheet, 'MIN');
    }

    if (maxPoints.length > 0) {
        XLSX.utils.book_append_sheet(workbook, maxSheet, 'MAX');
    }

    const sanitizedFieldName = metadata.fieldName.replace(/[/\\?%*:|"<>]/g, '_');
    const fileName = `${sanitizedFieldName}_${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

/**
 * Экспорт в текстовый файл (.txt)
 */
export function exportToText(
    avgPoints: readonly EChartsPoint[],
    minPoints: readonly EChartsPoint[],
    maxPoints: readonly EChartsPoint[],
    metadata: ExportMetadata,
): void {
    const lines: string[] = [
        '=== Chart Data Export ===',
        '',
        `Field: ${metadata.fieldName}`,
        `Context ID: ${metadata.contextId}`,
        `Export Date: ${metadata.exportDate}`,
        `Total Points: ${metadata.totalPoints}`,
    ];

    if (metadata.bucketMs !== undefined) {
        lines.push(`Bucket Size: ${metadata.bucketMs} ms`);
    }

    if (metadata.dataQuality !== undefined) {
        lines.push(`Data Quality: ${metadata.dataQuality}`);
    }

    lines.push('');

    lines.push('=== AVG DATA ===');
    lines.push('Timestamp (ms)\tISO Date\tValue\tCount');
    lines.push('-'.repeat(120));

    const avgData = convertEChartsPointsToExport(avgPoints);
    for (const point of avgData) {
        const valueStr = formatNumberForText(point.value);
        lines.push(
            `${point.timestamp}\t${point.isoDate}\t${valueStr}\t${point.count}`,
        );
    }

    if (minPoints.length > 0) {
        lines.push('');
        lines.push('=== MIN DATA ===');
        lines.push('Timestamp (ms)\tISO Date\tValue\tCount');
        lines.push('-'.repeat(120));

        const minData = convertEChartsPointsToExport(minPoints);
        for (const point of minData) {
            const valueStr = formatNumberForText(point.value);
            lines.push(
                `${point.timestamp}\t${point.isoDate}\t${valueStr}\t${point.count}`,
            );
        }
    }

    if (maxPoints.length > 0) {
        lines.push('');
        lines.push('=== MAX DATA ===');
        lines.push('Timestamp (ms)\tISO Date\tValue\tCount');
        lines.push('-'.repeat(120));

        const maxData = convertEChartsPointsToExport(maxPoints);
        for (const point of maxData) {
            const valueStr = formatNumberForText(point.value);
            lines.push(
                `${point.timestamp}\t${point.isoDate}\t${valueStr}\t${point.count}`,
            );
        }
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const sanitizedFieldName = metadata.fieldName.replace(/[/\\?%*:|"<>]/g, '_');
    link.download = `${sanitizedFieldName}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Экспорт в CSV
 */
export function exportToCSV(
    avgPoints: readonly EChartsPoint[],
    minPoints: readonly EChartsPoint[],
    maxPoints: readonly EChartsPoint[],
    metadata: ExportMetadata,
): void {
    const lines: string[] = [
        '# Chart Data Export',
        `# Field: ${metadata.fieldName}`,
        `# Context ID: ${metadata.contextId}`,
        `# Export Date: ${metadata.exportDate}`,
        `# Total Points: ${metadata.totalPoints}`,
    ];

    if (metadata.bucketMs !== undefined) {
        lines.push(`# Bucket Size: ${metadata.bucketMs} ms`);
    }

    if (metadata.dataQuality !== undefined) {
        lines.push(`# Data Quality: ${metadata.dataQuality}`);
    }

    lines.push('');
    lines.push('Series,Timestamp_ms,ISO_Date,Value,Count');

    const avgData = convertEChartsPointsToExport(avgPoints);
    for (const point of avgData) {
        const valueStr = formatNumberForText(point.value);
        lines.push(`AVG,${point.timestamp},${point.isoDate},${valueStr},${point.count}`);
    }

    if (minPoints.length > 0) {
        const minData = convertEChartsPointsToExport(minPoints);
        for (const point of minData) {
            const valueStr = formatNumberForText(point.value);
            lines.push(`MIN,${point.timestamp},${point.isoDate},${valueStr},${point.count}`);
        }
    }

    if (maxPoints.length > 0) {
        const maxData = convertEChartsPointsToExport(maxPoints);
        for (const point of maxData) {
            const valueStr = formatNumberForText(point.value);
            lines.push(`MAX,${point.timestamp},${point.isoDate},${valueStr},${point.count}`);
        }
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const sanitizedFieldName = metadata.fieldName.replace(/[/\\?%*:|"<>]/g, '_');
    link.download = `${sanitizedFieldName}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Универсальная функция экспорта
 */
export function exportChartData(
    avgPoints: readonly EChartsPoint[],
    minPoints: readonly EChartsPoint[],
    maxPoints: readonly EChartsPoint[],
    metadata: ExportMetadata,
    format: ExportFormat,
): void {
    if (format === 'excel') {
        exportToExcel(avgPoints, minPoints, maxPoints, metadata);
    } else if (format === 'csv') {
        exportToCSV(avgPoints, minPoints, maxPoints, metadata);
    } else {
        exportToText(avgPoints, minPoints, maxPoints, metadata);
    }
}