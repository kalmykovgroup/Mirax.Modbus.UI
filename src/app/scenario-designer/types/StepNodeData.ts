// только данные, лежащие в node.data (без hover/over)


import type {ConnectContext} from "@app/scenario-designer/types/ConnectContext.ts";

export type StepNodeData<T> = {
    object: T;
    connectContext? : ConnectContext;

};