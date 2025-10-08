import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared//dtos/ResolvedCharReqTemplate.ts";


export type GetMultiSeriesRequest = {
    template: ResolvedCharReqTemplate;
    px: number;
    bucketMs?: number | undefined;
}