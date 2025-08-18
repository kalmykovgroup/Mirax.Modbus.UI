
// @ts-ignore
export enum ModbusDeviceActionLoadOptions {
    None = 0,

    /** ModbusDeviceAction -> ModbusDeviceActionParameters -> ModbusDeviceParameter -> (Auto) RegisterDataType */
    Include_ActionParameters = 1 << 0, // 1

    /** ModbusDeviceAction -> ModbusDeviceActionScriptUsingFeature -> ScriptUsingFeature */
    Include_ScriptUsingFeature = 1 << 1, // 2

    Full =
        ModbusDeviceActionLoadOptions.Include_ActionParameters |
        ModbusDeviceActionLoadOptions.Include_ScriptUsingFeature,
}
