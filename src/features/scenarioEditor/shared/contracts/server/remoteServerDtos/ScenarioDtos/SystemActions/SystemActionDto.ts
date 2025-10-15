import type { SystemActionControlMode } from "@scenario/shared/contracts/server/types/Api.Shared/SystemActionControlMode.ts";
import type {BaseActionDto} from "@scenario/shared/contracts/server/remoteServerDtos/CommonDtos/BaseActionDto.ts";

export interface SystemActionDto extends BaseActionDto {
    /** Тип управляющего поведения SystemAction */
    controlMode: SystemActionControlMode;
    /** Нужно ли дождаться выполнения параллельного сценария */
    waitForScenarioCompletion: boolean;
}
