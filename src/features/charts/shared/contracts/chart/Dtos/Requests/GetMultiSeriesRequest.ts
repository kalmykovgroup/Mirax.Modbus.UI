
import type {ResolvedCharReqTemplate} from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";

export type GetMultiSeriesRequest = {
    template: ResolvedCharReqTemplate;
    from?: Date | undefined;
    to?: Date | undefined;
    px: number;
    bucketMs?: number | undefined;
}