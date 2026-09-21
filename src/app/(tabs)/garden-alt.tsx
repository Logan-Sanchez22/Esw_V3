import { View, Text, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { styled } from "nativewind";
import {SafeAreaView as RNSafeAreaView} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { PannableGrid } from '@/components/PannableGrid';
import { topDownGroundAtlas } from '@/lib/atlases/topdown-ground-atlas';
import { topDownTreesAtlas } from '@/lib/atlases/topdown-trees-atlas';
import { topDownProps32Atlas } from '@/lib/atlases/topdown-props-atlas';
import { topDownSmall16Atlas } from '@/lib/atlases/topdown-small-atlas';
import { CATALOG, GRID_SIZE, getCatalogItem } from '@/lib/garden-domain';
import { useGardenDomain } from '@/context/garden-domain-store';

const SafeAreaView = styled(RNSafeAreaView);

const TILE_SIZE = 48;
const PICKER_ICON_SIZE = 32;
const HEADER_HEIGHT = 210; // title + points + picker + safe area

// This atlas set doesn't have art for every catalog id (no bench, no
// second bush/tree shade) — those ids are simply left out below, so this
// screen's picker shows a subset of the isometric screen's. That's expected:
// the handoff notes top-down ground/decoration coverage lags the iso set.
const ITEM_SPRITE = {
    tree: { atlas: topDownTreesAtlas, key: 'treeCherryPink' as const },
    treeBare: { atlas: topDownTreesAtlas, key: 'treeTeal' as const },
    bush: { atlas: topDownProps32Atlas, key: 'flowerBushOrange' as const },
    bushAlt: { atlas: topDownProps32Atlas, key: 'flowerBushYellow' as const },
    flower: { atlas: topDownSmall16Atlas, key: 'tulipPink' as const },
    mushroom: { atlas: topDownSmall16Atlas, key: 'mushroomCluster' as const },
    rock: { atlas: topDownProps32Atlas, key: 'rockGray' as const },
    log: { atlas: topDownProps32Atlas, key: 'logPileAngled' as const },
};

const PICKER_ITEMS: PickerEntry[] = CATALOG.filter((item) => item.id in ITEM_SPRITE).map((item) => {
    const deco = ITEM_SPRITE[item.id as keyof typeof ITEM_SPRITE];
    return {
        id: item.id,
        label: item.label,
        cost: item.cost,
        icon: <AtlasSprite atlas={deco.atlas as any} sprite={deco.key as any} size={PICKER_ICON_SIZE} />,
    };
});

const GardenAlt = () => {
    const { state, placeItem } = useGardenDomain();
    const [selectedItemId, setSelectedItemId] = useState<string>(PICKER_ITEMS[0].id);

    return (
        <SafeAreaView className={"flex-1 bg-sky"}>
            <View className="p-5">
                <Text className="text-xl font-bold text-success mb-2">TopDown Garden</Text>
                <Text className="text-mutedForeground">{state.points} pts</Text>
            </View>

            <ItemPicker
                items={PICKER_ITEMS}
                selectedId={selectedItemId}
                onSelect={setSelectedItemId}
                points={state.points}
            />

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
                            onPress={() => {
                                const item = getCatalogItem(selectedItemId);
                                if (item) placeItem(i, item);
                            }}
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