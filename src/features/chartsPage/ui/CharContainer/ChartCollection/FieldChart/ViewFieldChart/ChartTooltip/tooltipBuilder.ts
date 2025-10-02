
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import ChartTooltip from './ChartTooltip';
import type { SeriesBinDto } from '@chartsPage/template/shared/contracts/chart/Dtos/SeriesBinDto';
import {formatBucketSize} from "@chartsPage/ui/CharContainer/ChartCollection/FieldChart/utils.ts";


export interface TooltipBuilderConfig {
    fieldName: string;
    data: SeriesBinDto[];
    bucketMs: number;
    timeZone?: string | undefined;
    useTimeZone?: boolean | undefined;
}

const formatDateTime = (
    timestamp: number,
    bucketMs: number,
    timeZone?: string | undefined,
    useTimeZone?: boolean | undefined): string => {
    const date = new Date(timestamp);

    if (useTimeZone && timeZone) {
        try {
            return date.toLocaleString('ru-RU', {
                timeZone: timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: bucketMs < 60000 ? '2-digit' : undefined
            });
        } catch (error) {
            console.error('Error formatting date with timezone:', error);
            // Fallback to default formatting
        }
    }

    // Fallback или когда не используется временная зона
    const bucketSec = bucketMs / 1000;

    if (bucketSec < 60) {
        return date.toLocaleTimeString('ru-RU');
    } else if (bucketSec < 3600) {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (bucketSec < 86400) {
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
};

/**
 * Создает функцию форматирования для tooltip с учетом временной зоны
 */
export function createTooltipFormatter(config: TooltipBuilderConfig) {
    const { fieldName, data, bucketMs, timeZone, useTimeZone } = config;


    return (params: any) => {
        try {
            // Защита от пустых данных
            if (!data || data.length === 0) {
                return `${fieldName}<br/>Нет данных`;
            }

            const paramsList = Array.isArray(params) ? params : [params];
            const firstParam = paramsList.find(p => p && p.data);

            if (!firstParam) return '';

            let timeValue: number | undefined;

            // Попытка получить время из разных источников
            if (Array.isArray(firstParam.data)) {
                timeValue = firstParam.data[0] as number;
            } else if (firstParam.axisValue !== undefined) {
                timeValue = Number(firstParam.axisValue);
            } else if (firstParam.value !== undefined) {
                if (Array.isArray(firstParam.value)) {
                    timeValue = firstParam.value[0];
                } else {
                    timeValue = Number(firstParam.value);
                }
            }

            if (!timeValue || !Number.isFinite(timeValue)) {
                return '';
            }

            // Находим bin с защитой
            const bin = data.find(b => {
                try {
                    const binTime = new Date(b.t).getTime();
                    return Math.abs(binTime - timeValue) < 1000;
                } catch {
                    return false;
                }
            });

            if (!bin) {
                // Если bin не найден, показываем только время
                return renderToStaticMarkup(
                    React.createElement(ChartTooltip, {
                        fieldName: fieldName,
                        title: formatDateTime(timeValue, bucketMs, timeZone, useTimeZone),
                        bin: {} as SeriesBinDto,
                    })
                );
            }


            // Рендерим полный tooltip
            return renderToStaticMarkup(
                React.createElement(ChartTooltip, {
                    fieldName: fieldName,
                    title: formatDateTime(timeValue, bucketMs, timeZone, useTimeZone),
                    bin: bin || { t: new Date(timeValue), avg: null, min: null, max: null, count: 0 },
                    bucketSize: bin ? formatBucketSize(bucketMs) : undefined
                })
            );
        } catch (error) {
            console.error('Tooltip formatter critical error:', error);
            return fieldName;
        }
    };
}