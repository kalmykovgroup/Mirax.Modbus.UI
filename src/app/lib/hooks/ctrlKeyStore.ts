// src/lib/hooks/ctrlKeyStore.ts

type Listener = (isPressed: boolean) => void;

class CtrlKeyStore {
    private isPressed = false;
    private listeners: Set<Listener> = new Set();

    get(): boolean {
        return this.isPressed;
    }

    set(value: boolean): void {
        if (this.isPressed !== value) {
            this.isPressed = value;
            this.notifyListeners();
        }
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        // Сразу вызываем listener с текущим значением
        listener(this.isPressed);

        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach((listener) => listener(this.isPressed));
    }
}

export const ctrlKeyStore = new CtrlKeyStore();