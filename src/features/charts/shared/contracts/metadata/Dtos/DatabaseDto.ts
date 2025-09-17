import type {Guid} from "@app/lib/types/Guid.ts";
import {DbProviderType} from "@charts/shared/contracts/metadata/Types/DbProviderType.ts";
import {DatabaseStatus} from "@charts/shared/contracts/metadata/Types/DatabaseStatus.ts";
import {DatabaseAvailability} from "@charts/shared/contracts/metadata/Types/DatabaseAvailability.ts";
import type {EntityDto} from "@charts/shared/contracts/metadata/Dtos/EntityDto.ts";
import type {ChartReqTemplateDto} from "@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts";

export type DatabaseDto = {
    id: Guid;
    name: string;
    databaseVersion: string;
    connectionString: string;
    provider: DbProviderType;
    databaseStatus: DatabaseStatus;
    availability: DatabaseAvailability;
    lastConnectivityAt?: Date | undefined;
    LastConnectivityError?: string | undefined;

    entities: EntityDto[]
    chartReqTemplates: ChartReqTemplateDto[]
};