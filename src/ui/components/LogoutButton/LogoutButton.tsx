
import { useNavigate } from 'react-router-dom'
import styles from './LogoutButton.module.css'
import {useAppDispatch} from "@/baseStore/hooks.ts";
import {useLogoutMutation} from "@login/shared/api/authApi.ts";
import {ROUTES} from "@app/constants/routes.ts";
import {resetAuthState} from "@login/store/authSlice.ts";

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
            <button className={styles.btnSend}
                onClick={handleLogout}
            >
                Выйти
            </button>
    )
}

export default LogoutButton
