import React from 'react';
import cls from './AnimatedGradientDark.module.css';

type Props = {
    /** скорость полного цикла (сек) */
    speedSec?: number;
    /** усиление насыщенности (1 = без усиления) */
    saturate?: number;
    /** общая непрозрачность фона (0..1) */
    opacity?: number;
    /** 4 цвета для градиента (тёмная палитра) */
    colors?: [string, string, string, string];
    className?: string;
};

export default function AnimatedGradientDark({
                                                 speedSec = 20,
                                                 saturate = 1.1,
                                                 opacity = 0.9,
                                                 // Тёмные «идеальные» по ощущениям под WebStorm/Darcula
                                                 colors = ['#0F172A', '#1E293B', '#312E81', '#0B3B4F'],
                                                 className,
                                             }: Props) {
    const style: React.CSSProperties = {
        // кастомные CSS-переменные для модуля
        // @ts-ignore
        '--ag-speed': `${speedSec}s`,
        '--ag-saturate': String(saturate),
        '--ag-opacity': String(opacity),
        '--ag-c1': colors[0],
        '--ag-c2': colors[1],
        '--ag-c3': colors[2],
        '--ag-c4': colors[3],
    };

    return (
        <div
            className={`${cls.bg} ${className ?? ''}`}
            style={style}
            aria-hidden
            role="presentation"
        />
    );
}
