import type {ResolvedCharReqTemplate} from "@charts/template/shared/dtos/ResolvedCharReqTemplate.ts";


export type GetMultiSeriesRequest = {
    template: ResolvedCharReqTemplate;
    from?: Date | undefined;
    to?: Date | undefined;
    px: number;
    bucketMs?: number | undefined;
}