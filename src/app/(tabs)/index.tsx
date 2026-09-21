import "@/global.css"
import { Text, View } from "react-native";
import {Link} from "expo-router";
import { styled } from "nativewind";
import {SafeAreaView as RNSafeAreaView} from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  return (
      <SafeAreaView className={"flex-1 bg-background p-5"}>
        <Text className="text-7xl font-sans-extrabold text-error">
          Home
        </Text>
        <Link
            href="/onboarding"
            style={{
                marginTop: 16,
                fontFamily: 'sans-bold',
                borderRadius: 4,
                backgroundColor: '#34D399',
                color: 'white',
                padding: 16,
                overflow: 'hidden',
            }}
        >
            Go to onboarding
        </Link>
      </SafeAreaView>
  );
}