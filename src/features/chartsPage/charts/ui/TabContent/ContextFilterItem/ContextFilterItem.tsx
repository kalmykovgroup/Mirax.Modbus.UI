// ========== ЭЛЕМЕНТ ФИЛЬТРА ==========

import {useSelector} from "react-redux";
import type {Guid} from "@app/lib/types/Guid.ts";
import type {RootState} from "@/store/store.ts";
import {selectTemplate} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import styles from "./ContextFilterItem.module.css"
interface ContextFilterItemProps {
    readonly tabId: Guid;
    readonly contextId: Guid;
    readonly isVisible: boolean;
    readonly onToggle: () => void;
    readonly onRemove: () => void;
}

export function ContextFilterItem({ contextId, isVisible, onToggle, onRemove }: ContextFilterItemProps) {
    const template = useSelector((state: RootState) => selectTemplate(state, contextId));
    const templateName = template?.name ?? `Контекст ${contextId.slice(0, 8)}`;

    return (
        <div className={styles.contextItem}>
            <label className={styles.contextCheckbox}>
                <input type="checkbox" checked={isVisible} onChange={onToggle} />
                <span className={styles.contextName}>{templateName}</span>
            </label>
            <button
                className={styles.contextRemove}
                onClick={onRemove}
                title="Удалить контекст"
                type="button"
            >
                ×
            </button>
        </div>
    );
}