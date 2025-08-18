// @ts-ignore
export enum ModbusDeviceLoadOptions {
    Default = 0,

    /** ModbusDevice -> ModbusDeviceTemplates */
    Include_Template = 1 << 0, // 1

    /** ModbusDevice -> ModbusDeviceTemplates -> ModbusDeviceParameters -> (Auto) RegisterDataType */
    Include_Template_Parameters = 1 << 1, // 2

    /** ModbusDevice -> ModbusDeviceTemplates -> ModbusDeviceActions */
    Include_Template_Actions = 1 << 2, // 4

    /** ModbusDevice -> ModbusDeviceTemplates -> ModbusDeviceActions -> ModbusDeviceActionParameters -> ModbusDeviceParameter -> (Auto) RegisterDataType */
    Include_Template_ActionParameters = 1 << 3, // 8

    /** ModbusDevice -> ModbusDeviceTemplates -> ModbusDeviceActions -> ModbusDeviceActionScriptUsingFeature -> ScriptUsingFeature */
    Include_Template_Action_ScriptUsingFeature = 1 << 4, // 16

    FullDetails =
        ModbusDeviceLoadOptions.Include_Template |
        ModbusDeviceLoadOptions.Include_Template_Parameters |
        ModbusDeviceLoadOptions.Include_Template_Actions |
        ModbusDeviceLoadOptions.Include_Template_ActionParameters |
        ModbusDeviceLoadOptions.Include_Template_Action_ScriptUsingFeature,
}
