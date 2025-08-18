import type {ConnectionType} from "@shared/contracts/Types/ConnectionType.ts";

export interface CreateModbusDeviceAddressRequest {
    connectionType: ConnectionType;
    slaveId: number;
    comPort?: string | null;
    baudRate?: number | null;
    dataBits?: number | null;
    parity?: 'None' | 'Odd' | 'Even' | 'Mark' | 'Space' | null; // System.IO.Ports.Parity
    stopBits?: 'None' | 'One' | 'Two' | 'OnePointFive' | null; // System.IO.Ports.StopBits
    ipAddress?: string | null;
    port?: number | null;
    readTimeout: number;
    writeTimeout: number;
    retries: number;
}
