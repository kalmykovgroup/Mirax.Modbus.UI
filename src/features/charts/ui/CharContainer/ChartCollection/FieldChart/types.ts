// charts/ui/CharContainer/FieldChart/types.ts


// События графика
import type {ChartEvent} from "@charts/ui/CharContainer/types/ChartEvent.ts";

export type ChartEventType =
    | 'zoom'
    | 'resize'
    | 'levelSwitch'
    | 'dataRequest'
    | 'error'
    | 'ready'
    | 'brush'
    | 'click';



// Статистика графика
export interface ChartStats {
    coverage: number;           // Процент покрытия данными
    density: number;            // Плотность точек на пиксель
    totalPoints: number;        // Всего точек
    visiblePoints: number;      // Видимых точек
    gaps?: number | undefined;              // Количество разрывов
    quality?: 'good' | 'medium' | 'poor' | undefined;
    currentBucket?: string | undefined;     // Текущий уровень агрегации
}


export interface ZoomEvent extends ChartEvent {
    type: 'zoom';
    range: { from: number; to: number };
    px: number;
}

export interface ResizeEvent extends ChartEvent {
    type: 'resize';
    width: number;
    height: number;
}

export interface LevelSwitchEvent extends ChartEvent {
    type: 'levelSwitch';
    fromBucket: number;
    toBucket: number;
    reason: string;
}

export interface DataRequestEvent extends ChartEvent {
    type: 'dataRequest';
    bucketMs: number;
    intervals: Array<{ from: number; to: number }>;
}

