import type {ChartEventType} from "@charts/ui/CharContainer/ChartCollection/FieldChart/types.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";

export interface ChartEvent {
    type: ChartEventType;
    field: FieldDto;
    timestamp: number;
    payload?: any;
}