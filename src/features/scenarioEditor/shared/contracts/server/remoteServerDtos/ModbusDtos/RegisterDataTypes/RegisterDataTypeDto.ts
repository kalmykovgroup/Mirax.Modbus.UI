import type { ClrType } from "@scenario/shared/contracts/server/types/Api.Shared/ClrType.ts";

export interface RegisterDataTypeDto {
    id: string;
    name: string;
    byteCount: number;
    clrType: ClrType;
}
