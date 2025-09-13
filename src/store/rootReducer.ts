import { combineReducers } from '@reduxjs/toolkit';
import {authApi} from "@login/shared/api/authApi.ts";
import {scenarioApi} from "@/features/scenarioEditor/shared/api/scenarioApi.ts";
import userReducer from "@/features/user/store/userSlice.ts";
import authReducer from "@login/store/authSlice.ts";
import {workflowApi} from "@/features/scenarioEditor/shared/api/workflowApi.ts";

import {branchApi} from "@/features/scenarioEditor/shared/api/branchApi.ts";
import {stepApi} from "@/features/scenarioEditor/shared/api/stepApi.ts";
import {stepRelationApi} from "@/features/scenarioEditor/shared/api/stepRelationApi.ts";
import scenarioSlice from "@/features/scenarioEditor/store/scenarioSlice.ts";
import workflowSlice from "@/features/scenarioEditor/store/workflowSlice.ts";
import {chartsApi} from "@charts/shared/api/chartsApi.ts";
import chartsSlice from "@charts/store/chartsSlice.ts";
import chartsTemplatesSlice from "@charts/store/chartsTemplatesSlice.ts";
import {chartReqTemplatesApi} from "@charts/shared/api/chartReqTemplatesApi.ts";
import chartsMetaSlice from "@charts/store/chartsMetaSlice.ts";
import {metadataApi} from "@charts/shared/api/metadataApi.ts";

export const rootReducer = combineReducers({
    // RTK Query хранит кэш ИМЕННО под своим reducerPath
    [authApi.reducerPath]: authApi.reducer,
    [scenarioApi.reducerPath]: scenarioApi.reducer,
    [workflowApi.reducerPath]: workflowApi.reducer,
    [branchApi.reducerPath]: branchApi.reducer,
    [stepApi.reducerPath]: stepApi.reducer,
    [stepRelationApi.reducerPath]: stepRelationApi.reducer,
    [chartsApi.reducerPath]: chartsApi.reducer,
    [chartReqTemplatesApi.reducerPath]: chartReqTemplatesApi.reducer,
    [metadataApi.reducerPath]: metadataApi.reducer,

    charts: chartsSlice,
    chartsMeta: chartsMetaSlice,
    chartsTemplates: chartsTemplatesSlice,
    auth: authReducer ,
    users: userReducer,
    scenario: scenarioSlice,
    workflow: workflowSlice,


});
