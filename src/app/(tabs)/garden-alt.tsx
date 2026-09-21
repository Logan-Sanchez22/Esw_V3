import { View, Text, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { styled } from "nativewind";
import {SafeAreaView as RNSafeAreaView} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { ModeToggle } from '@/components/ModeToggle';
import { PannableGrid } from '@/components/PannableGrid';
import { topDownGroundAtlas } from '@/lib/atlases/topdown-ground-atlas';
import { topDownTreesAtlas } from '@/lib/atlases/topdown-trees-atlas';
import { topDownProps32Atlas } from '@/lib/atlases/topdown-props-atlas';
import { topDownSmall16Atlas } from '@/lib/atlases/topdown-small-atlas';
import {
    CATALOG,
    GRID_SIZE,
    GROUND_CATALOG,
    REMOVE_TOOL_ID,
    getCatalogItem,
    getPlacementBlock,
} from '@/lib/garden-domain';
import { useGardenDomain } from '@/context/garden-domain-store';
import { useStatusMessage } from '@/lib/useStatusMessage';

const SafeAreaView = styled(RNSafeAreaView);

const TILE_SIZE = 48;
const PICKER_ICON_SIZE = 32;
const HEADER_HEIGHT = 250; // title + points + mode toggle + picker + safe area

type Mode = 'decorate' | 'paint';

const MODE_OPTIONS = [
    { id: 'decorate' as const, label: '🌳 Decorate' },
    { id: 'paint' as const, label: '🎨 Ground' },
];

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

// Top-down ground atlas only has grass/dirt/water — no stone-path equivalent,
// so that GROUND_CATALOG entry is filtered out below, same idea as ITEM_SPRITE.
const GROUND_SPRITE: Record<string, keyof typeof topDownGroundAtlas.sprites> = {
    grass: 'grass',
    dirt: 'dirt',
    water: 'water',
};

const PICKER_ITEMS: PickerEntry[] = [
    { id: REMOVE_TOOL_ID, label: 'Remove', cost: 0, icon: <Text style={{ fontSize: 22 }}>🗑️</Text> },
    ...CATALOG.filter((item) => item.id in ITEM_SPRITE).map((item) => {
        const deco = ITEM_SPRITE[item.id as keyof typeof ITEM_SPRITE];
        return {
            id: item.id,
            label: item.label,
            cost: item.cost,
            icon: <AtlasSprite atlas={deco.atlas as any} sprite={deco.key as any} size={PICKER_ICON_SIZE} />,
        };
    }),
];

const GROUND_PICKER_ITEMS: PickerEntry[] = GROUND_CATALOG.filter((ground) => ground.id in GROUND_SPRITE).map(
    (ground) => ({
        id: ground.id,
        label: ground.label,
        cost: 0,
        icon: (
            <AtlasSprite
                atlas={topDownGroundAtlas}
                sprite={GROUND_SPRITE[ground.id]}
                size={PICKER_ICON_SIZE}
                fit="stretch"
            />
        ),
    })
);

const GardenAlt = () => {
    const { state, placeItem, removeItem, paintGround } = useGardenDomain();
    const [mode, setMode] = useState<Mode>('decorate');
    const [selectedItemId, setSelectedItemId] = useState<string>(CATALOG[0].id);
    const [selectedGroundId, setSelectedGroundId] = useState<string>(GROUND_PICKER_ITEMS[0].id);
    const { message, showMessage } = useStatusMessage();

    return (
        <SafeAreaView className={"flex-1 bg-sky"}>
            <View className="p-5">
                <Text className="text-xl font-bold text-success mb-2">TopDown Garden</Text>
                <Text className="text-mutedForeground">{state.points} pts</Text>
                {message && <Text className="text-warning mt-1">{message}</Text>}
            </View>

            <ModeToggle options={MODE_OPTIONS} selected={mode} onSelect={setMode} />

            {mode === 'decorate' ? (
                <ItemPicker
                    items={PICKER_ITEMS}
                    selectedId={selectedItemId}
                    onSelect={setSelectedItemId}
                    points={state.points}
                />
            ) : (
                <ItemPicker
                    items={GROUND_PICKER_ITEMS}
                    selectedId={selectedGroundId}
                    onSelect={setSelectedGroundId}
                    points={state.points}
                />
            )}

            <PannableGrid
                gridSize={GRID_SIZE}
                tileSize={TILE_SIZE}
                headerHeight={HEADER_HEIGHT}
                renderTile={(i) => {
                    const tile = state.tiles[i];
                    const deco = tile.item ? ITEM_SPRITE[tile.item as keyof typeof ITEM_SPRITE] : null;
                    const groundKey = GROUND_SPRITE[tile.ground] ?? 'grass';
                    const decorationSize = TILE_SIZE * (tile.item ? getCatalogItem(tile.item)?.visualScale ?? 1 : 1);

                    return (
                        <TouchableOpacity
                            style={{ width: TILE_SIZE, height: TILE_SIZE }}
                            onPress={() => {
                                if (mode === 'paint') {
                                    paintGround(i, selectedGroundId);
                                    return;
                                }

                                if (selectedItemId === REMOVE_TOOL_ID) {
                                    if (tile.item === null) showMessage('Nothing to remove here');
                                    else removeItem(i);
                                    return;
                                }

                                const item = getCatalogItem(selectedItemId);
                                if (!item) return;

                                const block = getPlacementBlock(state, i, item);
                                if (block === 'occupied') showMessage('Tile already has something — remove it first');
                                else if (block === 'insufficient-points') showMessage('Not enough points');
                                else placeItem(i, item);
                            }}
                        >
                            <AtlasSprite atlas={topDownGroundAtlas} sprite={groundKey} size={TILE_SIZE} fit="stretch" />
                            {deco && (
                                <View style={{ position: 'absolute', bottom: 0, alignSelf: 'center' }}>
                                    <AtlasSprite atlas={deco.atlas as any} sprite={deco.key as any} size={decorationSize} />
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
