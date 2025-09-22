import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {setNavigate} from "@app/providers/navigation.ts";

export const NavigateProvider = () => {
    const navigate = useNavigate()

    useEffect(() => {
        setNavigate(navigate)
    }, [navigate])

    return null
}