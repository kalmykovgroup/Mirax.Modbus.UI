import type {ConnectionType} from "@shared/contracts/Types/Api.Shared/ConnectionType.ts";

export interface ModbusDeviceAddressDto {
    id: string;
    connectionType: ConnectionType;
    slaveId: number;
    comPort?: string | null;
    baudRate?: number | null;
    dataBits?: number | null;
    parity?: 'None' | 'Odd' | 'Even' | 'Mark' | 'Space' | null;
    stopBits?: 'None' | 'One' | 'Two' | 'OnePointFive' | null;
    ipAddress?: string | null;
    port?: number | null;
    readTimeout: number;
    writeTimeout: number;
    retries: number;
}
