declare global {
    interface AppTab {
        name: string;
        title: string;
        // A single emoji glyph — matches the icon language used everywhere
        // else in the app (buttons, empty states, quest cards), see
        // constants/data.ts.
        icon: string;
    }

    interface TabIconProps {
        focused: boolean;
        icon: string;
    }
}

export {};