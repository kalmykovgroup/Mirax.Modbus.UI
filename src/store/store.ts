import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./rootReducer";
import { persistStore } from "redux-persist";
import {authApi} from "@login/shared/api/authApi.ts";
import {scenarioApi} from "@/features/scenarioEditor/shared/api/scenarioApi.ts";
import {workflowApi} from "@/features/scenarioEditor/shared/api/workflowApi.ts";
import {branchApi} from "@/features/scenarioEditor/shared/api/branchApi.ts";
import {stepApi} from "@/features/scenarioEditor/shared/api/stepApi.ts";
import {chartsApi} from "@charts/shared/api/chartsApi.ts";
import {chartReqTemplatesApi} from "@charts/shared/api/chartReqTemplatesApi.ts";
import {metadataApi} from "@charts/shared/api/metadataApi.ts";

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
            immutableCheck: false,
        })
            .concat(
                authApi.middleware,
                scenarioApi.middleware,
                workflowApi.middleware,
                branchApi.middleware,
                stepApi.middleware,
                chartsApi.middleware,
                chartReqTemplatesApi.middleware,
                metadataApi.middleware,
            ),
})


export const persistor = persistStore(store);
