
import { useNavigate } from 'react-router-dom'
import styles from './LogoutButton.module.css'
import {useAppDispatch} from "@/store/hooks.ts";
import {useLogoutMutation} from "@shared/api/authApi.ts";
import {ROUTES} from "@app/constants/routes.ts";
import {resetAuthState} from "@/store/features/user/authSlice.ts";

const LogoutButton = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const [logoutRequest] = useLogoutMutation()

    const handleLogout = async () => {
        try {
            await logoutRequest().unwrap()
        } catch (e) {
            console.warn('Ошибка при logout — возможно, сессия уже завершена')
        }

        dispatch(resetAuthState())
        navigate(ROUTES.LOGIN, { replace: true })
    }

    return (
        <div className={styles.container}>
            <button
                onClick={handleLogout}
            >
                Выйти
            </button>
        </div>
    )
}

export default LogoutButton
