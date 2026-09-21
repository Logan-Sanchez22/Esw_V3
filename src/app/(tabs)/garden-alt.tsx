import { View, Text, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { styled } from "nativewind";
import {
    SafeAreaView as RNSafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { ModeToggle } from '@/components/ModeToggle';
import { PlacementConfirmBar } from '@/components/PlacementConfirmBar';
import { UnknownItemMarker } from '@/components/UnknownItemMarker';
import { PannableGrid } from '@/components/PannableGrid';
import { topDownGroundAtlas } from '@/lib/atlases/topdown-ground-atlas';
import { topDownTreesAtlas } from '@/lib/atlases/topdown-trees-atlas';
import { topDownProps32Atlas, topDownProps48Atlas } from '@/lib/atlases/topdown-props-atlas';
import { topDownSmall16Atlas, topDownTuft16x32Atlas } from '@/lib/atlases/topdown-small-atlas';
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
    // treeTeal (topDownTreesAtlas) turned out to be a flat, low-detail round
    // canopy silhouette — confirmed on-device it reads as an unrecognizable
    // blob at decoration size, and doesn't look like a "bare tree" at all.
    // A stump is a much more honest fit for that concept, and has real
    // wood-grain detail that survives being scaled down. stumpSmall (32x32,
    // topDownProps32Atlas) stays available for a future distinct catalog
    // item if wanted.
    treeBare: { atlas: topDownProps48Atlas, key: 'stumpBig' as const },
    bush: { atlas: topDownProps32Atlas, key: 'flowerBushOrange' as const },
    bushAlt: { atlas: topDownProps32Atlas, key: 'flowerBushYellow' as const },
    flower: { atlas: topDownSmall16Atlas, key: 'tulipPink' as const },
    mushroom: { atlas: topDownSmall16Atlas, key: 'mushroomCluster' as const },
    rock: { atlas: topDownProps32Atlas, key: 'rockGray' as const },
    log: { atlas: topDownProps32Atlas, key: 'logPileAngled' as const },
    // Top-down only — see the comment on these two in CATALOG.
    lilyPad: { atlas: topDownProps32Atlas, key: 'lilyPadFlower' as const },
    grassTuft: { atlas: topDownTuft16x32Atlas, key: 'grassTuftTall' as const },
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
    const insets = useSafeAreaInsets();
    const bottomNavSpace = 100 + insets.bottom;

    // Which tile is showing a pending (unconfirmed) decoration ghost —
    // pure UI state, never touches domain state until Confirm is tapped.
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // A stale ghost must never keep showing once what's selected changes.
    useEffect(() => {
        setPreviewIndex(null);
    }, [selectedItemId, mode]);

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

            <View style={{ flex: 1 }}>
                <PannableGrid
                    gridSize={GRID_SIZE}
                    tileSize={TILE_SIZE}
                    headerHeight={HEADER_HEIGHT}
                    renderTile={(i) => {
                        const tile = state.tiles[i];
                        const isPreview = i === previewIndex;
                        const itemId = isPreview ? selectedItemId : tile.item;
                        const deco = itemId ? ITEM_SPRITE[itemId as keyof typeof ITEM_SPRITE] : null;
                        const groundKey = GROUND_SPRITE[tile.ground] ?? 'grass';
                        const decorationSize = TILE_SIZE * (itemId ? getCatalogItem(itemId)?.visualScale ?? 1 : 1);

                        return (
                            <TouchableOpacity
                                style={{
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                    borderWidth: isPreview ? 2 : 1,
                                    borderColor: isPreview ? '#facc15' : 'rgba(0,0,0,0.18)',
                                    // Border eats into the content box (RN sizing is border-box) —
                                    // clip so the fixed-size ground sprite doesn't spill past it.
                                    overflow: 'hidden',
                                }}
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
                                    else setPreviewIndex(i);
                                }}
                            >
                                <AtlasSprite atlas={topDownGroundAtlas} sprite={groundKey} size={TILE_SIZE} fit="stretch" />
                                {itemId && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            alignSelf: 'center',
                                            opacity: isPreview ? 0.55 : 1,
                                        }}
                                    >
                                        {deco ? (
                                            <AtlasSprite atlas={deco.atlas as any} sprite={deco.key as any} size={decorationSize} />
                                        ) : (
                                            // Placed via the other screen with no top-down art yet
                                            // (e.g. bench) — see UnknownItemMarker.
                                            <UnknownItemMarker size={decorationSize} />
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
                {previewIndex !== null && (
                    <PlacementConfirmBar
                        itemLabel={getCatalogItem(selectedItemId)?.label ?? 'item'}
                        bottom={bottomNavSpace + 12}
                        onConfirm={() => {
                            const item = getCatalogItem(selectedItemId);
                            if (item && previewIndex !== null) placeItem(previewIndex, item);
                            setPreviewIndex(null);
                        }}
                        onCancel={() => setPreviewIndex(null)}
                    />
                )}
            </View>
        </SafeAreaView>
    )
}
export default GardenAlt
