// "(tabs)" is another Expo Router route group (see (auth)/_layout.tsx's
// comment) — every screen file inside src/app/(tabs)/ automatically becomes
// one of the bottom tab bar's tabs, listed in constants/data.ts's `tabs`
// array below. This layout is also where the app decides, on every cold
// start, whether to actually show the tabs at all, or redirect to
// onboarding / sign-in first.
import {Redirect, Tabs} from "expo-router"
import {useAuth} from "@clerk/expo";
import {tabs} from "../../../constants/data";
import {useEffect, useState} from "react";
import {Text, View} from "react-native";
import clsx from "clsx";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {colors, components} from "../../../constants/theme";
import {hasSeenOnboarding} from "@/lib/onboarding-storage";

const tabBar = components.tabBar;

const TabLayout = () => {
    const insets = useSafeAreaInsets();
    const { isLoaded, isSignedIn } = useAuth();
    // Device-scoped, not account-scoped — checked once here since this is
    // the layout that owns the app's root path ("/").
    const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

    useEffect(() => {
        hasSeenOnboarding().then(setOnboardingSeen);
    }, []);

    // Wait for both checks before deciding — deciding early would flash a
    // redirect (to onboarding, or to sign-in for an already-signed-in user)
    // on cold start.
    // `<Redirect href="..." />` is Expo Router's component form of
    // navigation — rendering it (instead of calling a function) tells the
    // router "immediately replace the current screen with this route."
    // Returning one of these from a layout, before the actual <Tabs>, is
    // how this file gatekeeps access to the whole tab bar.
    if (!isLoaded || onboardingSeen === null) return null;
    if (!onboardingSeen) return <Redirect href="/onboarding" />;
    if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

    const TabIcon = ({focused, icon}: TabIconProps) => {
        return (
            <View className={"tabs-icon"}>
                <View className={clsx('tabs-pill', focused && 'tabs-active')}>
                    <Text style={{ fontSize: 24, lineHeight: 28 }}>{icon}</Text>
                </View>
            </View>
        );
    };

    // `<Tabs>` is Expo Router's bottom-tab-bar navigator; each `<Tabs.Screen
    // name="...">` below (generated from constants/data.ts's `tabs` list)
    // points at a same-named file in this folder (so name="garden" renders
    // garden.tsx). `screenOptions` here styles the tab bar itself — the
    // floating pill look, sizing, etc — not any individual screen's content.
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: "absolute",
                    bottom: Math.max(insets.bottom, tabBar.horizontalInset),
                    height: tabBar.height,
                    marginHorizontal: tabBar.horizontalInset,
                    borderRadius: tabBar.radius,
                    backgroundColor: colors.primary,
                    borderTopWidth: 0,
                    elevation: 0,
                },
                tabBarItemStyle: {
                    paddingVertical: tabBar.height / 2 - tabBar.iconFrame / 1.6
                },
                tabBarIconStyle: {
                    width: tabBar.iconFrame,
                    height: tabBar.iconFrame,
                    alignItems: "center",
                }
        }}
        >
            {tabs.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        tabBarIcon: ({focused}) => (
                            <TabIcon focused={focused} icon={tab.icon}/>
                        )
                    }}/>
            ))}
        </Tabs>
    )
}

export default TabLayout;