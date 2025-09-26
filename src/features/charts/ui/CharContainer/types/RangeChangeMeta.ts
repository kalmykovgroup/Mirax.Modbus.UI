import type {RangeChangeAction} from "@charts/ui/CharContainer/types/RangeChangeAction.ts";

/**
 * Доп. сведения о том, КАК изменился видимый диапазон (zoom/pan).
 *
 * Базовые величины:
 *  - Текущее окно:   [fromMs, toMs]
 *  - Предыдущее окно: prevWindowRef
 *  - Ширина окна:    spanMs = toMs - fromMs
 *  - Центр окна:     centerMs = fromMs + spanMs / 2
 *  - Δ ширины:       deltaSpanMs = spanMs - prevSpanMs
 *  - Сдвиг центра:   shiftMs = centerMs - prevCenterMs
 *
 * Классификация:
 *  - 'zoom-in'  если |deltaSpanMs| заметно и deltaSpanMs < 0
 *  - 'zoom-out' если |deltaSpanMs| заметно и deltaSpanMs > 0
 *  - 'pan'      если |deltaSpanMs| незначительно, но |shiftMs| заметен
 *  - 'noop'     если ни ширина, ни центр почти не изменились
 *  - 'init'     для самого первого окна
 */
export interface ExtendedRangeChangeMeta {
    action: RangeChangeAction;
    fromMs: number;           // Новое окно start в ms (UTC)
    toMs: number;             // Новое окно end в ms (UTC)
    px: number;               // Ширина чарта (для maxPoints)
    field: string;            // Имя поля (field.name)
    zoomLevel?: number;       // полезно для логов/условной дозагрузки
}

