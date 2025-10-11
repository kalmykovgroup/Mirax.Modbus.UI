import type {Guid} from "@app/lib/types/Guid.ts";

/**
 * Испытание (Technical Run)
 */
export interface TechnicalRunDto {
    readonly id: Guid; // Guid в C# -> string в TS
    readonly name: string | undefined;
    readonly dateStarTime: string; // DateTime -> ISO string
    readonly dateEndTime: string;
}