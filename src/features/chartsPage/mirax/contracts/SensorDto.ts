import type {Guid} from "@app/lib/types/Guid.ts";

/**
 * Сенсор
 */
export interface SensorDto {
    readonly id: Guid;
    readonly gas: string;
    readonly channelNumber: number;

    readonly displayUnits?: string | undefined;
    readonly mainUnits?: string | undefined;
    readonly modification: string | undefined;
}
