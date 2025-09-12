import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./rootReducer";
import { persistStore } from "redux-persist";
import {authApi} from "@shared/api/authApi.ts";
import {scenarioApi} from "@shared/api/scenarioApi.ts";
import {workflowApi} from "@shared/api/workflowApi.ts";
import {branchApi} from "@shared/api/branchApi.ts";
import {stepApi} from "@shared/api/stepApi.ts";
import {chartsApi} from "@/charts/shared/api/chartsApi.ts";
import {chartReqTemplatesApi} from "@/charts/shared/api/chartReqTemplatesApi.ts";

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
            ),
})


export const persistor = persistStore(store);
