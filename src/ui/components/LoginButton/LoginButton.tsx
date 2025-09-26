
import {NavLink} from 'react-router-dom'
import styles from './LoginButton.module.css'
import {ROUTES} from "@app/constants/routes.ts";

export const LoginButton = () => {


    return (

        <button className={styles.btnSend} >
            <NavLink  to={ROUTES.LOGIN}>
                <span>Войти</span>
            </NavLink>
        </button>

    )
}