// src/features/scenarioEditor/core/features/fieldLockSystem/useFieldGroup.ts

import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerGroup, selectIsGroupLocked, selectIsGroupHidden } from './fieldLockSlice';

interface UseFieldGroupParams {
    /** Уникальный идентификатор группы */
    groupId: string;
    /** Отображаемое название группы */
    label: string;
    /** Описание группы (опционально) */
    description?: string;
}

interface UseFieldGroupResult {
    /** Группа заблокирована для редактирования */
    isLocked: boolean;
    /** Группа скрыта */
    isHidden: boolean;
    /** Группа видима (не скрыта) */
    isVisible: boolean;
}

/**
 * Хук для работы с группой полей
 * Автоматически регистрирует группу при первом использовании
 */
export function useFieldGroup({ groupId, label, description }: UseFieldGroupParams): UseFieldGroupResult {
    const dispatch = useDispatch();

    const isLocked = useSelector(selectIsGroupLocked(groupId));
    const isHidden = useSelector(selectIsGroupHidden(groupId));

    // Регистрируем группу при первом монтировании
    useEffect(() => {
        dispatch(registerGroup({ id: groupId, label, description }));
    }, [dispatch, groupId, label, description]);

    return useMemo(
        () => ({
            isLocked,
            isHidden,
            isVisible: !isHidden,
        }),
        [isLocked, isHidden]
    );
}
