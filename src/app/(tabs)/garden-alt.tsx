import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { styled } from "nativewind";
import {SafeAreaView as RNSafeAreaView} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { PannableGrid } from '@/components/PannableGrid';
import { topDownGroundAtlas } from '@/lib/atlases/topdown-ground-atlas';
import { topDownTreesAtlas } from '@/lib/atlases/topdown-trees-atlas';
import { topDownProps32Atlas } from '@/lib/atlases/topdown-props-atlas';
import { topDownSmall16Atlas } from '@/lib/atlases/topdown-small-atlas';
import { GRID_SIZE } from '@/lib/garden-domain';
import { useGardenDomain } from '@/context/garden-domain-store';

const SafeAreaView = styled(RNSafeAreaView);

const TILE_SIZE = 48;
const HEADER_HEIGHT = 140; // title + points + safe area

const ITEM_SPRITE = {
    tree: { atlas: topDownTreesAtlas, key: 'treeCherryPink' as const },
    bush: { atlas: topDownProps32Atlas, key: 'flowerBushOrange' as const },
    mushroom: { atlas: topDownSmall16Atlas, key: 'mushroomCluster' as const },
};

const GardenAlt = () => {
    const { state, placeItem } = useGardenDomain();

    return (
        <SafeAreaView className={"flex-1 bg-sky"}>
            <View className="p-5">
                <Text className="text-xl font-bold text-success mb-2">TopDown Garden</Text>
                <Text className="text-mutedForeground">{state.points} pts</Text>
            </View>

            <PannableGrid
                gridSize={GRID_SIZE}
                tileSize={TILE_SIZE}
                headerHeight={HEADER_HEIGHT}
                renderTile={(i) => {
                    const placed = state.tiles[i];
                    const deco = placed ? ITEM_SPRITE[placed as keyof typeof ITEM_SPRITE] : null;
                    return (
                        <TouchableOpacity
                            style={{ width: TILE_SIZE, height: TILE_SIZE }}
                            onPress={() => placeItem(i, { id: 'tree', label: 'Tree', cost: 10 })}
                        >
                            <AtlasSprite atlas={topDownGroundAtlas} sprite="grass" size={TILE_SIZE} fit="stretch" />
                            {deco && (
                                <View style={{ position: 'absolute', bottom: 0 }}>
                                    <AtlasSprite atlas={deco.atlas as any} sprite={deco.key as any} size={TILE_SIZE} />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />
        </SafeAreaView>
    )
}
export default GardenAlt