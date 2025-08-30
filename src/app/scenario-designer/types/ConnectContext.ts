// контекст «драг-соединения» — ТОЛЬКО старт
import type {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import type {ConnectFrom} from "@app/scenario-designer/types/ConnectFrom.ts";

export type ConnectContext = {
    from: {
        nodeId: string;
        type: FlowType;
        handleType: ConnectFrom;
        handleId?: string | null;
    };
};
