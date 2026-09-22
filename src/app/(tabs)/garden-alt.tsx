import { View, Text, TouchableOpacity } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { styled } from "nativewind";
import {
    SafeAreaView as RNSafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { DecorationShadow } from '@/components/DecorationShadow';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { ModeToggle } from '@/components/ModeToggle';
import { PlacementConfirmBar } from '@/components/PlacementConfirmBar';
import { UnknownItemMarker } from '@/components/UnknownItemMarker';
import { PannableGrid } from '@/components/PannableGrid';
import { topDownGroundAtlas } from '@/lib/atlases/topdown-ground-atlas';
import { getDecorationSprite } from '@/lib/decorations';
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

// Top-down ground atlas only has grass/dirt/water — no stone-path equivalent,
// so that GROUND_CATALOG entry is filtered out below, same idea as the
// decoration coverage gaps in src/lib/decorations.ts.
const GROUND_SPRITE: Record<string, keyof typeof topDownGroundAtlas.sprites> = {
    grass: 'grass',
    dirt: 'dirt',
    water: 'water',
};

const PICKER_ITEMS: PickerEntry[] = [
    { id: REMOVE_TOOL_ID, label: 'Remove', cost: 0, icon: <Text style={{ fontSize: 22 }}>🗑️</Text> },
    ...CATALOG.filter((item) => getDecorationSprite(item.id, 'topDown')).map((item) => {
        const deco = getDecorationSprite(item.id, 'topDown')!;
        return {
            id: item.id,
            label: item.label,
            cost: item.cost,
            icon: <AtlasSprite atlas={deco.atlas} sprite={deco.key} size={PICKER_ICON_SIZE} />,
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

    // Brief red flash on a tile that was just tapped but blocked — same
    // pattern as useStatusMessage's timeout, but keyed to a tile index
    // instead of text, so it can render as a fill on that one tile.
    const [invalidFlashIndex, setInvalidFlashIndex] = useState<number | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flashInvalid = (index: number) => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setInvalidFlashIndex(index);
        flashTimer.current = setTimeout(() => setInvalidFlashIndex(null), 400);
    };
    useEffect(() => () => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
    }, []);

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
                        const isFlash = i === invalidFlashIndex;
                        const itemId = isPreview ? selectedItemId : tile.item;
                        const deco = itemId ? getDecorationSprite(itemId, 'topDown') : undefined;
                        const groundKey = GROUND_SPRITE[tile.ground] ?? 'grass';
                        const decorationSize = TILE_SIZE * (itemId ? getCatalogItem(itemId)?.visualScale ?? 1 : 1);

                        return (
                            <TouchableOpacity
                                style={{
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                    borderWidth: isPreview || isFlash ? 2 : 1,
                                    borderColor: isFlash ? '#ef4444' : isPreview ? '#facc15' : '#4A3728',
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
                                    if (block === 'occupied') {
                                        showMessage('Tile already has something — remove it first');
                                        flashInvalid(i);
                                    } else if (block === 'non-placeable-terrain') {
                                        showMessage("Can't place on water");
                                        flashInvalid(i);
                                    } else if (block === 'insufficient-points') {
                                        showMessage('Not enough points');
                                        flashInvalid(i);
                                    } else {
                                        setPreviewIndex(i);
                                    }
                                }}
                            >
                                <AtlasSprite atlas={topDownGroundAtlas} sprite={groundKey} size={TILE_SIZE} fit="stretch" />
                                {isFlash && (
                                    <View
                                        pointerEvents="none"
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(239,68,68,0.35)' }}
                                    />
                                )}
                                {itemId && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            alignSelf: 'center',
                                            opacity: isPreview ? 0.55 : 1,
                                        }}
                                    >
                                        <DecorationShadow size={decorationSize} />
                                        {deco ? (
                                            <AtlasSprite atlas={deco.atlas} sprite={deco.key} size={decorationSize} />
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
