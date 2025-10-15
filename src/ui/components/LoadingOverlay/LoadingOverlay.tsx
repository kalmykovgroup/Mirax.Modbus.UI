import { createPortal } from 'react-dom';
import { useAppSelector } from '@/baseStore/hooks.ts';
import {selectUiLocked} from "@/baseStore/uiSlice.ts";
export default function LoadingOverlay() {
    const locked = useAppSelector(selectUiLocked);
    if (!locked) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/40 border-t-white" />
            </div>
        </div>,
        document.body
    );
}