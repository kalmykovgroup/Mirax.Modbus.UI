import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { History } from 'lucide-react';
import styles from './ExecutionHistoryButton.module.css';
import type { AppDispatch } from '@/baseStore/store.ts';
import { openExecutionHistoryModal } from '@scenario/store/executionHistorySlice.ts';
import { selectActiveScenarioId } from '@scenario/store/scenarioSelectors.ts';
import { useSelector } from 'react-redux';

export function ExecutionHistoryButton() {
    const dispatch = useDispatch<AppDispatch>();
    const activeScenarioId = useSelector(selectActiveScenarioId);

    const handleClick = useCallback(() => {
        dispatch(openExecutionHistoryModal({ scenarioId: activeScenarioId }));
    }, [dispatch, activeScenarioId]);

    return (
        <button
            className={styles.historyButton}
            onClick={handleClick}
            title="История выполнения сценария"
        >
            <History size={20} />
        </button>
    );
}
