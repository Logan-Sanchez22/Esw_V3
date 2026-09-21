import { View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import { styled } from "nativewind";
import { Link } from "expo-router";
import {
    SafeAreaView as RNSafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { IsometricGrid } from '@/components/IsometricGrid';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { ModeToggle } from '@/components/ModeToggle';
import { PlacementConfirmBar } from '@/components/PlacementConfirmBar';
import { UnknownItemMarker } from '@/components/UnknownItemMarker';
import { isoBlocksAtlas } from '@/lib/atlases/iso-blocks-atlas';
import { isoDecorationAtlas } from '@/lib/atlases/iso-decoration-atlas';
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
import { components } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

// Real measured tile geometry ratio is 30:14 (width:heightStep) — preserved
// here, just scaled up. At the old size (30/14) the map's total height was
// only 196px, shorter than any phone screen, so there was nothing to scroll
// — that's why vertical pan appeared "capped." This size gives ~1350px of
// vertical map, comfortably taller than any phone viewport.
const TILE_WIDTH = 60;
const TILE_HEIGHT_STEP = 28;
const TILE_OUTLINE_COLOR = '#4A3728';
const PREVIEW_HIGHLIGHT_COLOR = '#facc15';

const PICKER_ICON_SIZE = 32;

type Mode = 'decorate' | 'paint';

const MODE_OPTIONS = [
    { id: 'decorate' as const, label: '🌳 Decorate' },
    { id: 'paint' as const, label: '🎨 Ground' },
];

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

// All 47 iso ground tiles exist in the atlas — these four are the curated
// selection exposed as paintable ground types (see GROUND_CATALOG).
const GROUND_SPRITE: Record<string, keyof typeof isoBlocksAtlas.sprites> = {
    grass: 'grassFlat',
    dirt: 'soilPlain1',
    water: 'waterPlain',
    stonePath: 'stonePathPlain1',
};

// Not every catalog entry has iso art (lilyPad/grassTuft are top-down only) —
// filter to what ITEM_SPRITE actually covers, same pattern garden-alt.tsx
// already uses. Plus a "Remove" tool at the front for clearing a tile.
const PICKER_ITEMS: PickerEntry[] = [
    { id: REMOVE_TOOL_ID, label: 'Remove', cost: 0, icon: <Text style={{ fontSize: 22 }}>🗑️</Text> },
    ...CATALOG.filter((item) => item.id in ITEM_SPRITE).map((item) => ({
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
    })),
];

const GROUND_PICKER_ITEMS: PickerEntry[] = GROUND_CATALOG.map((ground) => ({
    id: ground.id,
    label: ground.label,
    cost: 0,
    icon: (
        <AtlasSprite
            atlas={isoBlocksAtlas}
            sprite={GROUND_SPRITE[ground.id]}
            size={PICKER_ICON_SIZE}
        />
    ),
}));

const Garden = () => {
    const { state, placeItem, removeItem, paintGround } = useGardenDomain();
    const [mode, setMode] = useState<Mode>('decorate');
    const [selectedItemId, setSelectedItemId] = useState<string>(CATALOG[0].id);
    const [selectedGroundId, setSelectedGroundId] = useState<string>(GROUND_CATALOG[0].id);
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
                <Text className="text-xl font-bold text-success mb-2">Isometric Garden</Text>
                <Text className="text-mutedForeground mb-2">{state.points} pts</Text>

                <Link href="/quest-page" style={{ color: '#6EE7B7', textDecorationLine: 'underline' }}>
                    Earn more points from Quests →
                </Link>

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
                    tileOutlineColor={TILE_OUTLINE_COLOR}
                    highlightIndex={previewIndex}
                    highlightColor={PREVIEW_HIGHLIGHT_COLOR}
                    onTilePress={(index) => {
                        if (mode === 'paint') {
                            paintGround(index, selectedGroundId);
                            return;
                        }

                        if (selectedItemId === REMOVE_TOOL_ID) {
                            if (state.tiles[index].item === null) showMessage('Nothing to remove here');
                            else removeItem(index);
                            return;
                        }

                        const item = getCatalogItem(selectedItemId);
                        if (!item) return;

                        const block = getPlacementBlock(state, index, item);
                        if (block === 'occupied') showMessage('Tile already has something — remove it first');
                        else if (block === 'non-placeable-terrain') showMessage("Can't place on water");
                        else if (block === 'insufficient-points') showMessage('Not enough points');
                        else setPreviewIndex(index);
                    }}
                    renderGround={(index) => (
                        <AtlasSprite
                            atlas={isoBlocksAtlas}
                            sprite={GROUND_SPRITE[state.tiles[index].ground] ?? 'grassFlat'}
                            size={TILE_WIDTH}
                        />
                    )}
                    renderDecoration={(index) => {
                        const tile = state.tiles[index];
                        const isPreview = index === previewIndex;
                        const itemId = isPreview ? selectedItemId : tile.item;
                        if (!itemId) return null;

                        const sprite = ITEM_SPRITE[itemId];
                        const catalogItem = getCatalogItem(itemId);
                        const decorationSize = TILE_WIDTH * (catalogItem?.visualScale ?? 1);

                        return (
                            <View style={isPreview ? { opacity: 0.55 } : undefined}>
                                {/* Invisible — exists only so this decoration's height/anchor
                                 math matches this tile's own ground sprite's, without
                                 duplicating the sprite sizing logic. Drawing is handled by
                                 the ground pass. */}
                                <AtlasSprite
                                    atlas={isoBlocksAtlas}
                                    sprite={GROUND_SPRITE[tile.ground] ?? 'grassFlat'}
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
                                    {sprite ? (
                                        <AtlasSprite
                                            atlas={isoDecorationAtlas}
                                            sprite={sprite}
                                            size={decorationSize}
                                        />
                                    ) : (
                                        // Placed via the other screen with no iso art yet
                                        // (e.g. lilyPad, grassTuft) — see UnknownItemMarker.
                                        <UnknownItemMarker size={decorationSize} />
                                    )}
                                </View>
                            </View>
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
export default Garden
