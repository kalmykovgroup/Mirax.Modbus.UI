import type { SystemActionControlMode } from "@shared/contracts/Types/Api.Shared/SystemActionControlMode.ts";
import type {BaseActionDto} from "@shared/contracts/Dtos/RemoteDtos/CommonDtos/BaseActionDto.ts";

export interface SystemActionDto extends BaseActionDto {
    /** Тип управляющего поведения SystemAction */
    controlMode: SystemActionControlMode;
    /** Нужно ли дождаться выполнения параллельного сценария */
    waitForScenarioCompletion: boolean;
}
