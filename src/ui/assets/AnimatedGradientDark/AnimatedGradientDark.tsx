
import cls from './AnimatedGradientDark.module.css';
import {useTheme} from "@app/providers/theme/useTheme.ts";

type Props = {
    className?: string;
};

export default function AnimatedGradientDark({ className }: Props) {
    const {theme} = useTheme();
    return (
        <div
            data-theme={theme}
            className={`${cls.bg} ${className ?? ''}`}
            aria-hidden
            role="presentation"
        />
    );
}
