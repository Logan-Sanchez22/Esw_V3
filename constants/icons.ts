import home from "../assets/icons/home.png";
import setting from "../assets/icons/setting.png";
import flower from "../assets/icons/flower.png";
import scroll from "../assets/icons/scroll.png";
import otherFlower from "../assets/icons/flowersecond.png";

export const icons = {
    home,
    setting,
    flower,
    scroll,
    otherFlower,
} as const;

export type IconKey = keyof typeof icons;
