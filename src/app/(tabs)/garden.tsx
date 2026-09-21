import { View, Text, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { styled } from "nativewind";
import {
    SafeAreaView as RNSafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { IsometricGrid } from '@/components/IsometricGrid';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { isoBlocksAtlas } from '@/lib/atlases/iso-blocks-atlas';
import { isoDecorationAtlas } from '@/lib/atlases/iso-decoration-atlas';
import { CATALOG, GRID_SIZE, getCatalogItem } from '@/lib/garden-domain';
import { useGardenDomain } from '@/context/garden-domain-store';
import { components } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

// Real measured tile geometry ratio is 30:14 (width:heightStep) — preserved
// here, just scaled up. At the old size (30/14) the map's total height was
// only 196px, shorter than any phone screen, so there was nothing to scroll
// — that's why vertical pan appeared "capped." This size gives ~1350px of
// vertical map, comfortably taller than any phone viewport.
const TILE_WIDTH = 60;
const TILE_HEIGHT_STEP = 28;

const PICKER_ICON_SIZE = 32;

const ITEM_SPRITE: Record<string, keyof typeof isoDecorationAtlas.sprites> = {
    tree: 'treeFullGrown',
    treeBare: 'treeBare',
    bush: 'bushRound1',
    bushAlt: 'bushRound2',
    flower: 'flowerBunchRed',
    mushroom: 'mushroomRed',
    rock: 'rockBoulder',
    log: 'logPair',
    bench: 'benchDetailed',
};

// Every catalog entry has iso art, so the isometric picker shows the whole catalog.
const PICKER_ITEMS: PickerEntry[] = CATALOG.map((item) => ({
    id: item.id,
    label: item.label,
    cost: item.cost,
    icon: (
        <AtlasSprite
            atlas={isoDecorationAtlas}
            sprite={ITEM_SPRITE[item.id]}
            size={PICKER_ICON_SIZE}
        />
    ),
}));

const Garden = () => {
    const { state, placeItem, addPoints } = useGardenDomain();
    const [selectedItemId, setSelectedItemId] = useState<string>(CATALOG[0].id);

    const insets = useSafeAreaInsets();

    const bottomNavSpace = 100 + insets.bottom;

    return (
        <SafeAreaView className={"flex-1 bg-sky"}>
            <View className="p-5">
                <Text className="text-xl font-bold text-success mb-2">Isometric Garden</Text>
                <Text className="text-mutedForeground mb-2">{state.points} pts</Text>

                {/* TEMPORARY — remove once real tasks/points wiring exists. */}
                <TouchableOpacity
                    onPress={() => addPoints(10)}
                    style={{ alignSelf: 'flex-start', backgroundColor: '#234d31', padding: 8, borderRadius: 8 }}
                >
                    <Text className="text-mutedForeground">+10 pts (test)</Text>
                </TouchableOpacity>
            </View>

            <ItemPicker
                items={PICKER_ITEMS}
                selectedId={selectedItemId}
                onSelect={setSelectedItemId}
                points={state.points}
            />

            <View
                style={{
                    flex: 1,
                    paddingBottom: bottomNavSpace,
                }}
            >
                <IsometricGrid
                    gridSize={GRID_SIZE}
                    tileWidth={TILE_WIDTH}
                    tileHeightStep={TILE_HEIGHT_STEP}
                    onTilePress={(index) => {
                        const item = getCatalogItem(selectedItemId);
                        if (item) placeItem(index, item);
                    }}
                    renderGround={() => (
                        <AtlasSprite
                            atlas={isoBlocksAtlas}
                            sprite="grassFlat"
                            size={TILE_WIDTH}
                        />
                    )}
                    renderDecoration={(index) => {
                        const placed = state.tiles[index];
                        if (!placed || !ITEM_SPRITE[placed]) return null;

                        return (
                            <View>
                                {/* Invisible — exists only so this decoration's height/anchor
                                 math matches a real ground tile's, without duplicating the
                                 sprite sizing logic. Drawing is handled by the ground pass. */}
                                <AtlasSprite
                                    atlas={isoBlocksAtlas}
                                    sprite="grassFlat"
                                    size={TILE_WIDTH}
                                    style={{ opacity: 0 }}
                                />

                                <View
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        alignSelf: 'center',
                                    }}
                                >
                                    <AtlasSprite
                                        atlas={isoDecorationAtlas}
                                        sprite={ITEM_SPRITE[placed]}
                                        size={TILE_WIDTH}
                                    />
                                </View>
                            </View>
                        );
                    }}
                />
            </View>
        </SafeAreaView>
    )
}
export default Garden