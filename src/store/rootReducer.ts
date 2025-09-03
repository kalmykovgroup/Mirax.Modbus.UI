import { combineReducers } from '@reduxjs/toolkit';
import {authApi} from "@shared/api/authApi.ts";
import {scenarioApi} from "@shared/api/scenarioApi.ts";
import userReducer from "@/store/features/user/userSlice.ts";
import authReducer from "@/store/features/user/authSlice.ts";
import workflowReducer from "@/store/features/workflow/workflowSlice.ts";
import scenarioReducer from "@/store/features/scenario/scenarioSlice.ts";
import {workflowApi} from "@shared/api/workflowApi.ts";

import {branchApi} from "@shared/api/branchApi.ts";
import {stepApi} from "@shared/api/stepApi.ts";
import {stepRelationApi} from "@shared/api/stepRelationApi.ts";

export const rootReducer = combineReducers({
    // RTK Query хранит кэш ИМЕННО под своим reducerPath
    [authApi.reducerPath]: authApi.reducer,
    [scenarioApi.reducerPath]: scenarioApi.reducer,
    [workflowApi.reducerPath]: workflowApi.reducer,
    [branchApi.reducerPath]: branchApi.reducer,
    [stepApi.reducerPath]: stepApi.reducer,
    [stepRelationApi.reducerPath]: stepRelationApi.reducer,

    auth: authReducer ,
    users: userReducer,
    scenario: scenarioReducer,
    workflow: workflowReducer,


});
