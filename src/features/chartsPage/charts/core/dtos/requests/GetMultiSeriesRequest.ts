import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared//dtos/ResolvedCharReqTemplate.ts";


export type GetMultiSeriesRequest = {
    template: ResolvedCharReqTemplate;
    from?: Date | undefined;
    to?: Date | undefined;
    px: number;
    bucketMs?: number | undefined;
}