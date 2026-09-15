import {View, Text} from 'react-native'
import React from 'react'
import { styled } from "nativewind";
import {SafeAreaView as RNSafeAreaView} from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);


const GardenAlt = () => {
    return (
        <SafeAreaView className={"flex-1 bg-background p-5"}>
            <Text className="text-xl font-bold text-success">TopDown Garden</Text>
        </SafeAreaView>
    )
}
export default GardenAlt
