// только данные, лежащие в node.data (без hover/over)


import type {ConnectContext} from "@app/scenario-designer/core/contracts/models/ConnectContext.ts";

export type StepNodeData<T> = {
    object: T;
    connectContext? : ConnectContext;
    x: number;
    y: number;

    /** Для BranchNode: подсветка цели дропа */
    isDropTarget?: boolean;
};