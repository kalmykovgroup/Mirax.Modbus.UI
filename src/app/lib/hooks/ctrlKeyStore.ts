let isCtrlPressedGlobal = false;
const listeners = new Set<(value: boolean) => void>();

export const ctrlKeyStore = {
    get: (): boolean => isCtrlPressedGlobal,

    set: (value: boolean): void => {
        if (isCtrlPressedGlobal !== value) {
            isCtrlPressedGlobal = value;
            listeners.forEach(listener => listener(value));
        }
    },

    subscribe: (listener: (value: boolean) => void): (() => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
};