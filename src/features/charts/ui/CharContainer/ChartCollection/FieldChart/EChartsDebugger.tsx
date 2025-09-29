// src/charts/debug/EChartsDebugger.ts

export class EChartsDebugger {
    private static instance: EChartsDebugger;
    private debugLog: Array<{
        timestamp: number;
        type: string;
        data: any;
        stackTrace?: string;
    }> = [];

    private constructor() {
        // Перехватываем глобальные ошибки ECharts
        if (typeof window !== 'undefined') {
            window.addEventListener('error', this.handleGlobalError.bind(this));
        }
    }

    public static getInstance(): EChartsDebugger {
        if (!EChartsDebugger.instance) {
            EChartsDebugger.instance = new EChartsDebugger();
        }
        return EChartsDebugger.instance;
    }

    private handleGlobalError(event: ErrorEvent) {
        if (event.message.includes('getRawIndex')) {
            this.log('CRITICAL_ERROR', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.stack
            });

            // Выводим последние 10 событий перед ошибкой
            console.error('=== ECharts Debug History Before Error ===');
            const recent = this.debugLog.slice(-10);
            recent.forEach((entry, idx) => {
                console.log(`[${idx}] ${new Date(entry.timestamp).toISOString()} - ${entry.type}:`, entry.data);
            });
            console.error('=== End Debug History ===');
        }
    }

    public log(type: string, data: any) {
        const entry = {
            timestamp: Date.now(),
            type,
            data: this.sanitizeData(data),
            stackTrace: new Error().stack
        };

        this.debugLog.push(entry);

        // Ограничиваем размер лога
        if (this.debugLog.length > 100) {
            this.debugLog.shift();
        }

        // Детальный вывод для критических событий
        if (type.includes('ERROR') || type.includes('WARNING')) {
            console.warn(`[EChartsDebug ${type}]`, data);
        }
    }

    private sanitizeData(data: any): any {
        try {
            // Клонируем и очищаем от циклических ссылок
            return JSON.parse(JSON.stringify(data, (key, value) => {
                if (key === 'chart' || key === 'dom' || key === '_model') {
                    return '[Circular Reference]';
                }
                if (value instanceof Date) {
                    return value.toISOString();
                }
                if (typeof value === 'function') {
                    return '[Function]';
                }
                return value;
            }));
        } catch (e) {
            return { error: 'Could not sanitize data', original: String(data) };
        }
    }

    public validateChartState(chart: any, context: string) {
        const validation = {
            context,
            timestamp: new Date().toISOString(),
            checks: {} as Record<string, any>
        };

        try {
            // Проверка 1: Инстанс графика
            validation.checks.hasInstance = !!chart;
            validation.checks.isDisposed = chart?.isDisposed?.() || false;

            // Проверка 2: Опции
            const option = chart?.getOption?.();
            validation.checks.hasOption = !!option;

            if (option) {
                // Проверка 3: Данные
                validation.checks.series = {
                    count: option.series?.length || 0,
                    data: option.series?.map((s: any) => ({
                        type: s.type,
                        dataLength: s.data?.length || 0,
                        hasData: !!s.data,
                        firstPoint: s.data?.[0],
                        lastPoint: s.data?.[s.data?.length - 1]
                    }))
                };

                // Проверка 4: DataZoom
                validation.checks.dataZoom = option.dataZoom?.map((dz: any) => ({
                    type: dz.type,
                    xAxisIndex: dz.xAxisIndex,
                    start: dz.start,
                    end: dz.end,
                    startValue: dz.startValue,
                    endValue: dz.endValue,
                    hasId: !!dz.id
                }));

                // Проверка 5: xAxis
                validation.checks.xAxis = {
                    type: option.xAxis?.type,
                    hasData: !!option.xAxis?.data,
                    dataLength: option.xAxis?.data?.length || 0,
                    min: option.xAxis?.min,
                    max: option.xAxis?.max
                };

                // Проверка 6: Dataset
                validation.checks.dataset = {
                    hasDataset: !!option.dataset,
                    sourceLength: option.dataset?.source?.length || 0
                };
            }

            // Проверка 7: Внутреннее состояние
            const model = (chart as any)?._model;
            validation.checks.internalModel = {
                hasModel: !!model,
                componentCount: model?.componentsCount?.() || 0
            };

        } catch (error: any) {
            validation.checks.error = {
                message: error.message,
                stack: error.stack
            };
        }

        this.log(`VALIDATION_${context}`, validation);
        return validation;
    }

    public wrapZoomHandler(originalHandler: Function, chartInstance: any, fieldName: string) {
        return (params: any) => {
            // До вызова
            this.log('ZOOM_BEFORE', {
                fieldName,
                params: this.sanitizeData(params),
                hasChart: !!chartInstance,
                isDisposed: chartInstance?.isDisposed?.()
            });

            // Валидация состояния
            const validation = this.validateChartState(chartInstance, 'BEFORE_ZOOM');

            // Проверяем критические условия
            if (!chartInstance || chartInstance.isDisposed()) {
                this.log('ZOOM_ABORTED', {
                    reason: 'Chart disposed or missing',
                    fieldName
                });
                return;
            }

            const option = chartInstance.getOption();
            if (!option?.series?.[0]?.data || option.series[0].data.length === 0) {
                this.log('ZOOM_ABORTED', {
                    reason: 'No data in series',
                    fieldName,
                    seriesInfo: option?.series?.map((s: any) => ({
                        type: s.type,
                        dataLength: s.data?.length || 0
                    }))
                });
                return;
            }

            try {
                // Вызываем оригинальный обработчик
                const result = originalHandler(params);

                this.log('ZOOM_SUCCESS', {
                    fieldName,
                    result: this.sanitizeData(result)
                });

                return result;
            } catch (error: any) {
                this.log('ZOOM_ERROR', {
                    fieldName,
                    error: {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    },
                    params: this.sanitizeData(params),
                    chartState: this.validateChartState(chartInstance, 'AFTER_ERROR')
                });

                throw error;
            }
        };
    }

    public dumpFullState() {
        console.group('=== ECharts Full Debug Dump ===');
        console.log('Debug Log:', this.debugLog);
        console.log('Log Size:', this.debugLog.length);
        console.groupEnd();

        return this.debugLog;
    }

    public clear() {
        this.debugLog = [];
    }
}

export const echartsDebugger = EChartsDebugger.getInstance();