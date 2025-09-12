import type {RawPointDto} from "@/charts/shared/contracts/chart/Dtos/RawPointDto.ts";

export type RawSeriesResponse = {
    entity: string;
    field: string;
    timeField: string;
    points: RawPointDto[];

}