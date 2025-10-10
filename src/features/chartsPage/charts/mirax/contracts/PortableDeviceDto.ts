import type {Guid} from "@app/lib/types/Guid.ts";

/**
 * Портативное устройство
 */
export interface PortableDeviceDto {
    readonly id: Guid;
    readonly factoryNumber: string | undefined;
    readonly name: string | undefined;
    readonly comPortName: string | undefined;
}