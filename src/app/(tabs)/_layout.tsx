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