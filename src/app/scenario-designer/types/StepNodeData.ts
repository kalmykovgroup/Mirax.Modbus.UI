// только данные, лежащие в node.data (без hover/over)

import type {FlowType} from "@app/scenario-designer/types/FlowType.ts";
import type {ConnectFrom} from "@app/scenario-designer/types/ConnectFrom.ts";

export type StepNodeData<T> = {
    object: T;
    connectFromType?: FlowType;      // тип узла-источника
    isConnecting?: boolean;          // сейчас идёт «drag connection»
    connectFrom?: ConnectFrom;
    x?: number;
    y?: number;
};