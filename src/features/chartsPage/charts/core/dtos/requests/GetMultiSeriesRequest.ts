import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared//dtos/ResolvedCharReqTemplate.ts";


export type GetMultiSeriesRequest = {
    template: ResolvedCharReqTemplate;
    fromMs?: number | undefined;
    toMs?: number | undefined;
    px: number;
    bucketMs?: number | undefined;
}