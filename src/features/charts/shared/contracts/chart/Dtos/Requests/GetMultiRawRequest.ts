
import type {ResolvedCharReqTemplate} from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";

export type GetMultiRawRequest = {
    template: ResolvedCharReqTemplate;
    from?: Date | undefined;
    to?: Date | undefined;
    maxPointsPerField?: number | undefined; // общий лимит на поле
}