import { useState } from 'react';
import { flushSync } from 'react-dom';

export const useThemeTransition = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    const toggleTheme = (checked: boolean, event?: any) => {
        const doc = document as any;

        if (!doc.startViewTransition || !event) {
            setIsDarkMode(checked);
            localStorage.setItem('theme', checked ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', checked ? 'dark' : 'light');
            return;
        }

        const x = event.clientX;
        const y = event.clientY;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const transition = doc.startViewTransition(() => {
            flushSync(() => {
                setIsDarkMode(checked);
                localStorage.setItem('theme', checked ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', checked ? 'dark' : 'light');
            });
        });

        transition.ready.then(() => {
            document.documentElement.animate(
                {
                    clipPath: checked
                        ? [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
                        : [`circle(${endRadius}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`],
                },
                {
                    duration: 400,
                    easing: 'ease-in-out',
                    pseudoElement: checked ? '::view-transition-new(root)' : '::view-transition-old(root)',
                }
            );
        });
    };

    return { isDarkMode, toggleTheme };
};