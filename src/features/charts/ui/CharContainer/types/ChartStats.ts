export interface ChartStats {
    coverage: number;           // Процент покрытия данными
    density: number;            // Плотность точек на пиксель
    totalPoints: number;        // Всего точек
    visiblePoints: number;      // Видимых точек
    gaps?: number | undefined;              // Количество разрывов
    quality?: 'good' | 'medium' | 'poor' | undefined;
    currentBucket?: string | undefined;     // Текущий уровень агрегации
}