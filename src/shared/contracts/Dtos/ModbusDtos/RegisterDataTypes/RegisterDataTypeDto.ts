import type { ClrType } from "@shared/contracts/Types/ClrType.ts";

export interface RegisterDataTypeDto {
    id: string;
    name: string;
    byteCount: number;
    clrType: ClrType;
}
