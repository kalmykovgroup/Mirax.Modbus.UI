import type {Guid} from "@app/lib/types/Guid.ts";

/**
 * Сенсор
 */
export interface SensorDto {
    readonly id: Guid;
    readonly gas: string;
    readonly channelNumber: number;
    readonly modification: string | undefined;
}