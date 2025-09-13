// контекст «драг-соединения» — ТОЛЬКО старт

import type {FlowType} from "@/features/scenarioEditor/shared/contracts/types/FlowType.ts";
import type {ConnectFrom} from "@/features/scenarioEditor/shared/contracts/models/ConnectFrom.ts";

export type ConnectContext = {
    from: {
        nodeId: string;
        type: FlowType;
        handleType: ConnectFrom;
        handleId?: string | null;
    };
};
