// контекст «драг-соединения» — ТОЛЬКО старт

import type {FlowType} from "@app/scenario-designer/core/contracts/types/FlowType.ts";
import type {ConnectFrom} from "@app/scenario-designer/core/contracts/models/ConnectFrom.ts";

export type ConnectContext = {
    from: {
        nodeId: string;
        type: FlowType;
        handleType: ConnectFrom;
        handleId?: string | null;
    };
};
