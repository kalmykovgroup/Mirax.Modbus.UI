import type { ClrType } from "@shared/contracts/Types/Api.Shared/ClrType.ts";

export interface RegisterDataTypeDto {
    id: string;
    name: string;
    byteCount: number;
    clrType: ClrType;
}
