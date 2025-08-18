export const API = {
    MODBUS_DEVICE_ACTION: {
        GET_ALL: `/api/modbus/device/action/all`,
        APPLY: `/api/modbus/device/action/apply`,
        APPLY_BY_ID: (id: string) => `/api/modbus/device/action/apply/${id}`,
        CREATE: `/api/modbus/device/action/create`,
        UPDATE: (id: string) => `/api/modbus/device/action/update/${id}`,
        DELETE: (id: string) => `/api/modbus/device/action/delete/${id}`,
        GET_BY_ID: (id: string) => `/api/modbus/device/action/${id}`,
    },
    MODBUS_DEVICE_ACTION_SCRIPT_USING_FEATURE: {
        GET_ALL: (modbusDeviceActionId: string) =>
            `/api/modbus-device-action-script-using-features/all/${modbusDeviceActionId}`,
        CREATE: `/api/modbus-device-action-script-using-features/create`,
        DELETE: (id: string) =>
            `/api/modbus-device-action-script-using-features/delete/${id}`,
    },
    MODBUS_DEVICE_ADDRESS: {
        GET_BY_ID: (id: string) => `/api/modbus/device/address/${id}`,
        CREATE: `/api/modbus/device/address/create`,
        UPDATE: (id: string) => `/api/modbus/device/address/update/${id}`,
    },
    MODBUS_DEVICE_PARAMETER: {
        GET_ALL: `/api/modbus/device/parameter/all`,
        CREATE: `/api/modbus/device/parameter/create`,
        UPDATE: (id: string) => `/api/modbus/device/parameter/update/${id}`,
        DELETE: (id: string) => `/api/modbus/device/parameter/delete/${id}`,
    },
    MODBUS_DEVICE: {
        GET_ALL: `/api/modbus/device/all`,
        CREATE: `/api/modbus/device/create`,
        APPLY: `/api/modbus/device/apply`,
        DELETE: (id: string) => `/api/modbus/device/delete/${id}`,
        UPDATE: (id: string) => `/api/modbus/device/update/${id}`,
        GET_BY_ID: (id: string) => `/api/modbus/device/${id}`,
        SCAN_COM: `/api/modbus/device/scan/com`,
        IDENTIFY: `/api/modbus/device/identify`,
        GET_BY_SERIAL_NUMBER: (serialNumber: string) =>
            `/api/modbus/device/by-serial-number/${serialNumber}`,
        EXIST_BY_SERIAL_NUMBER: (serialNumber: string) =>
            `/api/modbus/device/exist-by-serial-number/${serialNumber}`,
    },
    MODBUS_DEVICE_TEMPLATE: {
        GET_ALL: `/api/modbus/device/template/all`,
        CREATE: `/api/modbus/device/template/create`,
        UPDATE: (id: string) => `/api/modbus/device/template/update/${id}`,
        DELETE: (id: string) => `/api/modbus/device/template/delete/${id}`,
        GET_BY_ID: (id: string) => `/api/modbus/device/template/${id}`,
    },
    MODBUS_DEVICE_ACTION_CODE: {
        CREATE: `/api/modbus/device/action-code/create`,
        UPDATE: (id: string) => `/api/modbus/device/action-code/update/${id}`,
        DELETE: (id: string) => `/api/modbus/device/action-code/delete/${id}`,
    },
    MODBUS_DEVICE_ACTION_PARAMETER: {
        CREATE: `/api/modbus/action-parameter/add`,
        UPDATE: (id: string) => `/api/modbus/action-parameter/update/${id}`,
        DELETE: (id: string) => `/api/modbus/action-parameter/delete/${id}`,
    },

    BRANCH: {
        GET_BY_ID: (id: string) => `/api/branches/${id}`,
        GET_BY_PARALLEL_STEP: (id: string) => `/api/branches/by-step/${id}`,
        CREATE: `/api/branches/create`,
        UPDATE: (id: string) => `/api/branches/update/${id}`,
        DELETE: (id: string) => `/api/branches/delete/${id}`,
    },
    SCENARIO: {
        GET_ALL: `/api/scenario/all`,
        GET_BY_ID: (id: string) => `/api/scenario/${id}`,
        CREATE: `/api/scenario/add`,
        UPDATE: (id: string) => `/api/scenario/update/${id}`,
        DELETE: (id: string) => `/api/scenario/delete/${id}`,
        RUN: (id: string) => `/api/scenario/run/${id}`,
    },
    SCRIPT_USING_FEATURE: {
        GET_ALL: `/api/script-using-feature/all`,
        CREATE: `/api/script-using-feature/add`,
        UPDATE: (id: string) => `/api/script-using-feature/update/${id}`,
        DELETE: (id: string) => `/api/script-using-feature/delete/${id}`,
    },
    STEP: {
        GET_ALL_BY_BRANCH: (branchId: string) => `/api/steps/by-branch/${branchId}`,
        GET_BY_ID: (id: string) => `/api/steps/${id}`,
        CREATE: `/api/steps/create`,
        UPDATE: (id: string) => `/api/steps/update/${id}`,
        DELETE: (id: string) => `/api/steps/delete/${id}`,
    },
    SYSTEM_ACTION: {
        GET_ALL: `/api/system-actions/all`,
        GET_BY_ID: (id: string) => `/api/system-actions/${id}`,
        CREATE: `/api/system-actions/create`,
        UPDATE: (id: string) => `/api/system-actions/update/${id}`,
        DELETE: (id: string) => `/api/system-actions/delete/${id}`,
        APPLY: `/api/system-actions/apply`,
        APPLY_BY_ID: (id: string) => `/api/system-actions/apply-by-id/${id}`,
    },
    SYSTEM_ACTION_SCRIPT_USING_FEATURE: {
        CREATE: `/api/system-action-script-using-features/create`,
        DELETE: (id: string) => `/api/system-action-script-using-features/delete/${id}`,
    },
    WORKFLOW: {
        PAUSE: (id: string) => `/api/workflow/pause/${id}`,
        RESUME: (id: string) => `/api/workflow/resume/${id}`,
        STOP: (id: string) => `/api/workflow/stop/${id}`,
        RUN: (id: string) => `/api/workflow/run/${id}`,
    },

    PERMISSION: {
        GET_ALL: `/api/user/permission/all`,
        GET_BY_ID: (id: string) => `/api/user/permission/${id}`,
        CREATE: `/api/user/permission/add`,
        UPDATE: (id: string) => `/api/user/permission/update/${id}`,
        DELETE: (id: string) => `/api/user/permission/delete/${id}`,
    },
    ROLE: {
        GET_ALL: `/api/user/role/all`,
        GET_BY_ID: (id: string) => `/api/user/role/${id}`,
        CREATE: `/api/user/role/add`,
        UPDATE: (id: string) => `/api/user/role/update/${id}`,
        DELETE: (id: string) => `/api/user/role/delete/${id}`,
    },
    USER_ROLE: {
        CREATE: `/api/user-role/create`,
        DELETE: (id: string) => `/api/user-role/delete/${id}`,
    },
    USER: {
        LOGIN: `/api/user/login`,
        LOGOUT: `/api/user/logout`,
        REGISTER: `/api/user/register`,
        EXISTS: `/api/user/exists`,
        RESET_PASSWORD: `/api/user/reset-password`,
        INITIATE_PASSWORD_RESET: `/api/user/initiate-password-reset`,
        GET_ALL: `/api/user/all`,
        GET_BY_ID: (id: string) => `/api/user/${id}`,
        GET_BY_EMAIL: `/api/user/get`,
        CREATE: `/api/user/create`,
        UPDATE: (id: string) => `/api/user/update/${id}`,
        DELETE: (id: string) => `/api/user/delete/${id}`,
        ME: `/api/user/me`,
    },

};