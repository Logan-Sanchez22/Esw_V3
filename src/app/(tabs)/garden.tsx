import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { styled } from "nativewind";
import {SafeAreaView as RNSafeAreaView} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { IsometricGrid } from '@/components/IsometricGrid';
import { isoBlocksAtlas } from '@/lib/atlases/iso-blocks-atlas';
import { isoDecorationAtlas } from '@/lib/atlases/iso-decoration-atlas';
import { GRID_SIZE } from '@/lib/garden-domain';
import { useGardenDomain } from '@/context/garden-domain-store';

const SafeAreaView = styled(RNSafeAreaView);

// Real measured tile geometry ratio is 30:14 (width:heightStep) — preserved
// here, just scaled up. At the old size (30/14) the map's total height was
// only 196px, shorter than any phone screen, so there was nothing to scroll
// — that's why vertical pan appeared "capped." This size gives ~1350px of
// vertical map, comfortably taller than any phone viewport.
const TILE_WIDTH = 60;
const TILE_HEIGHT_STEP = 28;

const HEADER_HEIGHT = 180;

const ITEM_SPRITE: Record<string, keyof typeof isoDecorationAtlas.sprites> = {
    tree: 'treeFullGrown',
    bush: 'bushRound1',
    mushroom: 'mushroomRed',
};

const Garden = () => {
    const { state, placeItem, addPoints } = useGardenDomain();

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

            <IsometricGrid
                gridSize={GRID_SIZE}
                tileWidth={TILE_WIDTH}
                tileHeightStep={TILE_HEIGHT_STEP}
                onTilePress={(index) => placeItem(index, { id: 'tree', label: 'Tree', cost: 10 })}
                renderTile={(index) => {
                    const placed = state.tiles[index];
                    return (
                        <View>
                            {/* Natural, non-stretched size — these tiles are genuinely not square */}
                            <AtlasSprite atlas={isoBlocksAtlas} sprite="grassFlat" size={TILE_WIDTH} />
                            {placed && ITEM_SPRITE[placed] && (
                                <View style={{ position: 'absolute', bottom: 0, alignSelf: 'center' }}>
                                    <AtlasSprite atlas={isoDecorationAtlas} sprite={ITEM_SPRITE[placed]} size={TILE_WIDTH} />
                                </View>
                            )}
                        </View>
                    );
                }}
            />
        </SafeAreaView>
    )
}
export default Garden