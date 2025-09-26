
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {ResolvedCharReqTemplate} from "@charts/shared/contracts/chartTemplate/Dtos/ResolvedCharReqTemplate.ts";

export type GetRawRequest = {
    template: ResolvedCharReqTemplate;

    field: FieldDto

    from?: Date | undefined;
    to?: Date | undefined;

    maxPoints?: number | undefined; // ограничитель на всякий случай, чтобы не сломать сервер

}