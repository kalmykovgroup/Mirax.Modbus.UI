import type {ChartEventType} from "@charts/ui/CharContainer/ChartCollection/FieldChart/types.ts";

export interface ChartEvent {
    type: ChartEventType;
    field: string;
    timestamp: number;
    payload?: any;
}