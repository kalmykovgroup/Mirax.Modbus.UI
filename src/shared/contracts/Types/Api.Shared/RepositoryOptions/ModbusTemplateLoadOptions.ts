// @ts-ignore
export enum ModbusTemplateLoadOptions {
    None = 0,

    /** ModbusTemplate -> ModbusDeviceParameters -> (Auto) RegisterDataType */
    Include_Parameters = 1 << 0, // 1

    /** ModbusTemplate -> ModbusDeviceActions */
    Include_Actions = 1 << 1, // 2

    /** ModbusTemplate -> ModbusDeviceActions -> ModbusDeviceActionParameters -> ModbusDeviceParameter -> (Auto) RegisterDataType */
    Include_ActionParameters = 1 << 2, // 4

    /** ModbusTemplate -> ModbusDeviceActions -> ModbusDeviceActionScriptUsingFeature -> ScriptUsingFeature */
    Include_Action_ScriptUsingFeature = 1 << 3, // 8

    Full =
        ModbusTemplateLoadOptions.Include_Parameters |
        ModbusTemplateLoadOptions.Include_Actions |
        ModbusTemplateLoadOptions.Include_ActionParameters |
        ModbusTemplateLoadOptions.Include_Action_ScriptUsingFeature,
}
