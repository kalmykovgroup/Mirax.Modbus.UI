import type {Guid} from "@app/lib/types/Guid.ts";

export const API = {

    //CHARTS
    CHARTS: {
        SERIES:   '/charts/series',          // GET ?entity=&field=&timeField=&from=&to=&px&...filters
        MULTI:    '/charts/multi',    // POST { entity, fields, timeField, from, to, px, filters }
        RAW:    '/charts/raw',
        MULTI_RAW:  '/charts/multi-raw',
    },
    DATABASES: {
        ENTITIES : 'metadata/database/entities',
        FIELDS : 'metadata/database/fields',
        All : 'metadata/databases/all',
        CREATE : 'metadata/databases/create',
        UPDATE : (id: Guid) => `metadata/databases/update/${id}`,
        DELETE : (id: Guid) => `metadata/databases/delete/${id}`,
    },

    TEMPLATES: {
        All : '/templates/all',
        CREATE : '/templates/create',
        UPDATE : (id: Guid) => `/templates/update/${id}`,
        DELETE : (id: Guid) => `/templates/delete/${id}`,
    },
    //Local we abi
    WORKFLOW: {
        BASE: "/baseApi/workflow",
        RUN: (id: Guid) => `/api/workflow/run/${id}`,                 // GET
        SCENARIO_PAUSE: `/api/workflow/scenario/pause`,           // POST
        SCENARIO_RESUME: `/api/workflow/scenario/resume`,         // POST
        SCENARIO_STOP: `/api/workflow/scenario/stop`,             // POST
        BRANCH_PAUSE: `/api/workflow/branch/pause`,               // POST
        BRANCH_RESUME: `/api/workflow/branch/resume`,             // POST
        BRANCH_STOP: `/api/workflow/branch/stop`,                 // POST
    },


    //remote web baseApi
    MODBUS_DEVICE_ACTION: {
        GET_ALL: `/api/modbus/device/action/all`,
        APPLY: `/api/modbus/device/action/apply`,
        APPLY_BY_ID: (id: Guid) => `/api/modbus/device/action/apply/${id}`,
        CREATE: `/api/modbus/device/action/create`,
        UPDATE: (id: Guid) => `/api/modbus/device/action/update/${id}`,
        DELETE: (id: Guid) => `/api/modbus/device/action/delete/${id}`,
        GET_BY_ID: (id: Guid) => `/api/modbus/device/action/${id}`,
    },
    MODBUS_DEVICE_ACTION_SCRIPT_USING_FEATURE: {
        GET_ALL: (modbusDeviceActionId: Guid) =>
            `/api/modbus-device-action-script-using-features/all/${modbusDeviceActionId}`,
        CREATE: `/api/modbus-device-action-script-using-features/create`,
        DELETE: (id: Guid) =>
            `/api/modbus-device-action-script-using-features/delete/${id}`,
    },
    MODBUS_DEVICE_ADDRESS: {
        GET_BY_ID: (id: Guid) => `/api/modbus/device/address/${id}`,
        CREATE: `/api/modbus/device/address/create`,
        UPDATE: (id: Guid) => `/api/modbus/device/address/update/${id}`,
    },
    MODBUS_DEVICE_PARAMETER: {
        GET_ALL: `/api/modbus/device/parameter/all`,
        CREATE: `/api/modbus/device/parameter/create`,
        UPDATE: (id: Guid) => `/api/modbus/device/parameter/update/${id}`,
        DELETE: (id: Guid) => `/api/modbus/device/parameter/delete/${id}`,
    },
    MODBUS_DEVICE: {
        GET_ALL: `/api/modbus/device/all`,
        CREATE: `/api/modbus/device/create`,
        APPLY: `/api/modbus/device/apply`,
        DELETE: (id: Guid) => `/api/modbus/device/delete/${id}`,
        UPDATE: (id: Guid) => `/api/modbus/device/update/${id}`,
        GET_BY_ID: (id: Guid) => `/api/modbus/device/${id}`,
        SCAN_COM: `/api/modbus/device/scan/com`,
        IDENTIFY: `/api/modbus/device/identify`,
        GET_BY_SERIAL_NUMBER: (serialNumber: Guid) =>
            `/api/modbus/device/by-serial-number/${serialNumber}`,
        EXIST_BY_SERIAL_NUMBER: (serialNumber: Guid) =>
            `/api/modbus/device/exist-by-serial-number/${serialNumber}`,
    },
    MODBUS_DEVICE_TEMPLATE: {
        GET_ALL: `/api/modbus/device/template/all`,
        CREATE: `/api/modbus/device/template/create`,
        UPDATE: (id: Guid) => `/api/modbus/device/template/update/${id}`,
        DELETE: (id: Guid) => `/api/modbus/device/template/delete/${id}`,
        GET_BY_ID: (id: Guid) => `/api/modbus/device/template/${id}`,
    },
    MODBUS_DEVICE_ACTION_CODE: {
        CREATE: `/api/modbus/device/action-code/create`,
        UPDATE: (id: Guid) => `/api/modbus/device/action-code/update/${id}`,
        DELETE: (id: Guid) => `/api/modbus/device/action-code/delete/${id}`,
    },
    MODBUS_DEVICE_ACTION_PARAMETER: {
        CREATE: `/api/modbus/action-parameter/add`,
        UPDATE: (id: Guid) => `/api/modbus/action-parameter/update/${id}`,
        DELETE: (id: Guid) => `/api/modbus/action-parameter/delete/${id}`,
    },

    BRANCH: {
        GET_BY_ID: (id: Guid) => `/api/branches/${id}`,
        GET_BY_PARALLEL_STEP: (id: Guid) => `/api/branches/by-step/${id}`,
        CREATE: `/api/branches/create`,
        UPDATE: (id: Guid) => `/api/branches/update/${id}`,
        DELETE: (id: Guid) => `/api/branches/delete/${id}`,
    },
    SCENARIO: {
        ALL: `/api/scenario/all`,
        BY_ID: (id: Guid) => `/api/scenario/${id}`,
        CREATE: `/api/scenario/add`,
        UPDATE: (id: Guid) => `/api/scenario/update/${id}`,
        DELETE: (id: Guid) => `/api/scenario/delete/${id}`,
        CHANGE: (id: Guid) => `/api/scenario/change/${id}`,
    },
    SCRIPT_USING_FEATURE: {
        ALL: `/api/script-using-feature/all`,
        CREATE: `/api/script-using-feature/add`,
        UPDATE: (id: Guid) => `/api/script-using-feature/update/${id}`,
        DELETE: (id: Guid) => `/api/script-using-feature/delete/${id}`,
    },
    STEP: {
        ALL: (branchId: Guid) => `/api/steps/by-branch/${branchId}`,
        BY_ID: (id: Guid) => `/api/steps/${id}`,
        CREATE: `/api/steps/create`,
        UPDATE: (id: Guid) => `/api/steps/update/${id}`,
        DELETE: (id: Guid) => `/api/steps/delete/${id}`,
    },
    STEP_RELATION: {
        ALL: `/api/step-relation/all`,
        CREATE: `/api/step-relation/create`,
        UPDATE: (id: Guid) => `/api/step-relation/update/${id}`,
        DELETE: (id: Guid) => `/api/step-relation/delete/${id}`,
    },
    STEP_BRANCH_RELATION: {
        ALL: `/api/step-branch-relation/all`,
        CREATE: `/api/step-branch-relation/create`,
        UPDATE: (id: Guid) => `/api/step-branch-relation/update/${id}`,
        DELETE: (id: Guid) => `/api/step-branch-relation/delete/${id}`,
    },
    SYSTEM_ACTION: {
        GET_ALL: `/api/system-actions/all`,
        BY_ID: (id: Guid) => `/api/system-actions/${id}`,
        CREATE: `/api/system-actions/create`,
        UPDATE: (id: Guid) => `/api/system-actions/update/${id}`,
        DELETE: (id: Guid) => `/api/system-actions/delete/${id}`,
        APPLY: `/api/system-actions/apply`,
        APPLY_BY_ID: (id: Guid) => `/api/system-actions/apply-by-id/${id}`,
    },
    SYSTEM_ACTION_SCRIPT_USING_FEATURE: {
        CREATE: `/api/system-action-script-using-features/create`,
        DELETE: (id: Guid) => `/api/system-action-script-using-features/delete/${id}`,
    },
    PERMISSION: {
        GET_ALL: `/api/user/permission/all`,
        BY_ID: (id: Guid) => `/api/user/permission/${id}`,
        CREATE: `/api/user/permission/add`,
        UPDATE: (id: Guid) => `/api/user/permission/update/${id}`,
        DELETE: (id: Guid) => `/api/user/permission/delete/${id}`,
    },
    ROLE: {
        GET_ALL: `/api/user/role/all`,
        BY_ID: (id: Guid) => `/api/user/role/${id}`,
        CREATE: `/api/user/role/add`,
        UPDATE: (id: Guid) => `/api/user/role/update/${id}`,
        DELETE: (id: Guid) => `/api/user/role/delete/${id}`,
    },
    USER_ROLE: {
        CREATE: `/api/user-role/create`,
        DELETE: (id: Guid) => `/api/user-role/delete/${id}`,
    },
    USER: {
        LOGIN: `/api/user/login`,
        LOGOUT: `/api/user/logout`,
        REGISTER: `/api/user/register`,
        EXISTS: `/api/user/exists`,
        RESET_PASSWORD: `/api/user/reset-password`,
        INITIATE_PASSWORD_RESET: `/api/user/initiate-password-reset`,
        GET_ALL: `/api/user/all`,
        BY_ID: (id: Guid) => `/api/user/${id}`,
        BY_EMAIL: `/api/user/get`,
        CREATE: `/api/user/create`,
        UPDATE: (id: Guid) => `/api/user/update/${id}`,
        DELETE: (id: Guid) => `/api/user/delete/${id}`,
        ME: `/api/user/me`,
    },

    SCENARIO_EXECUTION_HISTORY: {
        ALL: `/api/scenario-execution-history/all`,
        BY_WORKFLOW_ID: (workflowId: string) => `/api/scenario-execution-history/workflow/${workflowId}`,
        BY_SCENARIO_ID: (scenarioId: Guid) => `/api/scenario-execution-history/scenario/${scenarioId}`,
        ACTIVE: `/api/scenario-execution-history/active`,
        CREATE: `/api/scenario-execution-history/create`,
        UPDATE_STATUS: `/api/scenario-execution-history/update-status`,
    },

    SCENARIO_RECOVERY_LOG: {
        CREATE: `/api/scenario-recovery-log/create`,
        BY_SCENARIO_ID: (scenarioId: Guid) => `/api/scenario-recovery-log/scenario/${scenarioId}`,
        BY_WORKFLOW_ID: (workflowId: string) => `/api/scenario-recovery-log/workflow/${workflowId}`,
        RECENT: (count: number = 100) => `/api/scenario-recovery-log/recent?count=${count}`,
    },

};