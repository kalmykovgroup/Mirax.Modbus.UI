import { useState, useEffect } from 'react';
import { ctrlKeyStore } from './ctrlKeyStore';

export function useCtrlKey(): boolean {
    const [isPressed, setIsPressed] = useState(ctrlKeyStore.get());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.key === 'Meta') {
                ctrlKeyStore.set(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.key === 'Meta') {
                ctrlKeyStore.set(false);
            }
        };

        const unsubscribe = ctrlKeyStore.subscribe(setIsPressed);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            unsubscribe();
        };
    }, []);

    return isPressed;
}