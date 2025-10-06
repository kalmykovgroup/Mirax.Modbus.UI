import type {FieldDto} from "@chartsPage/metaData/shared/dtos/FieldDto.ts";

export interface ChartEvent {
    type: ChartEventType;
    field: FieldDto;
    timestamp: number;
    payload?: any | undefined;
}

export type ChartEventType =
    | 'zoom'
    | 'resize'
    | 'levelSwitch'
    | 'dataRequest'
    | 'error'
    | 'ready'
    | 'brush'
    | 'click';

export interface ChartStats {
    coverage: number;           // Процент покрытия данными
    density: number;            // Плотность точек на пиксель
    totalPoints: number;        // Всего точек
    visiblePoints: number;      // Видимых точек
    gaps?: number | undefined;              // Количество разрывов
    quality?: 'good' | 'medium' | 'poor' | undefined;
    currentBucket?: string | undefined;     // Текущий уровень агрегации
}



// @ts-ignore
export enum RangeChangeAction {
    ZoomIn = 'zoom-in',
    ZoomOut = 'zoom-out',
    PanLeft = 'pan-left',
    PanRight = 'pan-right',
}

export interface ExtendedRangeChangeMeta {
    action: RangeChangeAction;
    fromMs: number;           // Новое окно start в ms (UTC)
    toMs: number;             // Новое окно end в ms (UTC)
    px: number;               // Ширина чарта (для maxPoints)
    field: string;            // Имя поля (field.name)
    zoomLevel?: number | undefined;       // полезно для логов/условной дозагрузки
}


// types/ChartLoadingTypes.ts


/**
 * Тип загрузки данных
 */
// @ts-ignore
export enum LoadingType {
    Initial = 'initial',     // Первичная загрузка при монтировании
    Zoom = 'zoom',        // Загрузка при зуме/пане
    Refresh = 'refresh',     // Обновление данных
    Background = 'background' , // Фоновая предзагрузка
    lazy = 'lazy'       // Ленивая загрузка невидимых данных
}
/**
 * Приоритет загрузки
 */
export type LoadingPriority = 'high' | 'normal' | 'low';

/**
 * Состояние загрузки
 */
export interface LoadingState {
    active: boolean;
    type: LoadingType;
    progress: number; // 0-100
    message?: string | undefined;
    startTime: number;
    estimatedEndTime?: number | undefined;
    bytesLoaded?: number | undefined;
    totalBytes?: number | undefined;
    queuePosition?: number | undefined;
    queueTotal?: number | undefined;
}







/**
 * Состояние ошибки
 */
export interface ErrorState {
    message: string;
    code?: string | undefined;
    retry?: (() => void) | undefined;
    details?: any | undefined;
}

/**
 * Информационное состояние
 */
export interface InfoState {
    message: string;
    type: 'info' | 'warning' | 'success';
    action?: {
        label: string;
        onClick: () => void;
    } | undefined;
}

/**
 * Параметры зума
 */
export interface ZoomParams {
    start: number;  // процент от 0 до 100
    end: number;    // процент от 0 до 100
    startValue?: any | undefined;
    endValue?: any | undefined;
    type: 'inside' | 'slider' | 'select';
}

/**
 * Статистика графика
 */

