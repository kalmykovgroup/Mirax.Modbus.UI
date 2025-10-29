// src/features/scenarioEditor/core/features/fieldLockSystem/index.ts

export { Block } from './Block';
export { FieldLockPanel } from './FieldLockPanel';
export { GroupControl } from './GroupControl';
export { useFieldGroup } from './useFieldGroup';

export {
    FieldGroupState,
    registerGroup,
    setGroupState,
    toggleGroupState,
    setMultipleGroupStates,
    setGlobalLock,
    resetAllGroups,
    unregisterGroup,
    selectAllGroups,
    selectGroupState,
    selectIsGroupLocked,
    selectIsGroupHidden,
    selectIsGroupVisible,
    selectGlobalLock,
    selectRegisteredGroupsCount,
    selectGroupsByState,
} from './fieldLockSlice';

export type { FieldGroupMetadata } from './fieldLockSlice';
