import home from "../assets/icons/home.png";
import setting from "../assets/icons/setting.png";
import flower from "../assets/icons/flower.png";
import scroll from "../assets/icons/scroll.png";
import compass from "../assets/icons/compass.png";

export const icons = {
    home,
    setting,
    flower,
    scroll,
    compass,
} as const;

export type IconKey = keyof typeof icons;
