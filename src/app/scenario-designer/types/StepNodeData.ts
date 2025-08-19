// только данные, лежащие в node.data (без hover/over)

import type {ConnectFrom} from "@app/scenario-designer/types/ConnectFrom.ts";
import type {FlowType} from "@app/scenario-designer/types/FlowType.ts";

export type StepNodeData<T> = {
    object: T;
    connectFrom: ConnectFrom;        // откуда тянем: source/target/null
    connectFromType?: FlowType;      // тип узла-источника
    isConnecting?: boolean;          // сейчас идёт «drag connection»
    x?: number;
    y?: number;
};