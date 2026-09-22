import { View, Text } from 'react-native'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { styled } from "nativewind";
import { Link } from "expo-router";
import {
    SafeAreaView as RNSafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AtlasSprite } from '@/components/AtlasSprite';
import { DecorationShadow } from '@/components/DecorationShadow';
import { IsometricGrid } from '@/components/IsometricGrid';
import { ItemPicker, PickerEntry } from '@/components/ItemPicker';
import { ModeToggle } from '@/components/ModeToggle';
import { PlacementConfirmBar } from '@/components/PlacementConfirmBar';
import { UnknownItemMarker } from '@/components/UnknownItemMarker';
import { isoBlocksAtlas, IsoBlockKey } from '@/lib/atlases/iso-blocks-atlas';
import { getDecorationSprite } from '@/lib/decorations';
import { pickVariant } from '@/lib/variantPick';
import {
    CATALOG,
    DEFAULT_CATALOG_ITEM_ID,
    GRID_SIZE,
    GROUND_CATALOG,
    REMOVE_TOOL_ID,
    getCatalogItem,
    getPlacementBlock,
    isItemUnlocked,
} from '@/lib/garden-domain';
import { useGardenDomain } from '@/context/garden-domain-store';
import { useStatusMessage } from '@/lib/useStatusMessage';
import { components } from '../../../constants/theme';

const SafeAreaView = styled(RNSafeAreaView);

// Precisely pixel-measured from blocks.png (grassFlat and soilPlain1 rects,
// both 30x27 native): the top face's own diamond (top point to bottom point)
// is exactly 16 native px, i.e. 32 at this screen's 2x scale (TILE_WIDTH=60
// vs the native rect's 30). An earlier pass here used 28 (an approximate
// "30:14" measurement) — close enough not to look obviously broken at a
// glance, but it made every tile's outline sit ~4px inside the sprite's real
// edge, visible as a thin sliver wherever a color/terrain boundary crosses a
// tile (confirmed on-device, then verified by compositing the real sprite
// at both step values before changing this). 32 is the step gridSize tiles
// are positioned at AND the height tile outlines are drawn at (IsometricGrid
// reuses tileHeightStep for both) — they must be the same number for a
// tile's outline to trace its own sprite's real edge.
const TILE_WIDTH = 60;
const TILE_HEIGHT_STEP = 32;
const TILE_OUTLINE_COLOR = '#4A3728';
const PREVIEW_HIGHLIGHT_COLOR = '#facc15';

const PICKER_ICON_SIZE = 32;

type Mode = 'decorate' | 'paint';

const MODE_OPTIONS = [
    { id: 'decorate' as const, label: '🌳 Decorate' },
    { id: 'paint' as const, label: '🎨 Ground' },
];

// All 47 iso ground tiles exist in the atlas — these four are the curated
// selection exposed as paintable ground types (see GROUND_CATALOG). This is
// also each type's picker-icon and fallback sprite — actual placed tiles use
// getGroundSpriteKey below for grass/dirt, which vary per-tile.
const GROUND_SPRITE: Record<string, keyof typeof isoBlocksAtlas.sprites> = {
    grass: 'grassFlat',
    dirt: 'soilPlain1',
    water: 'waterPlain',
    stonePath: 'stonePathPlain1',
};

// A few flat, plain variants per type (checked against the actual sprite
// sheet — not every "grass"-ish or "soil"-ish sprite qualifies: sparkle/moss/
// speckle sprites with visible extra detail were left out where they'd read
// as clutter rather than a subtle natural variation). Repeating an entry
// weights it higher — grassFlat/soilPlain1 stay the common case.
const GRASS_VARIANTS: readonly IsoBlockKey[] = ['grassFlat', 'grassFlat', 'grassPlain2', 'grassSparkle1'];
const DIRT_VARIANTS: readonly IsoBlockKey[] = ['soilPlain1', 'soilPlain1', 'soilPlain2', 'soilSpeckled1'];
const GROUND_VARIANTS: Partial<Record<string, readonly IsoBlockKey[]>> = {
    grass: GRASS_VARIANTS,
    dirt: DIRT_VARIANTS,
};

// Deterministic per-tile pick (same tile always renders the same variant,
// no new persisted field needed) — water/stonePath have no variant list, so
// they always fall through to their single GROUND_SPRITE entry.
function getGroundSpriteKey(groundId: string, tileIndex: number): keyof typeof isoBlocksAtlas.sprites {
    const variants = GROUND_VARIANTS[groundId];
    if (variants) return pickVariant(tileIndex, variants);
    return GROUND_SPRITE[groundId] ?? 'grassFlat';
}

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
    const [selectedItemId, setSelectedItemId] = useState<string>(DEFAULT_CATALOG_ITEM_ID);
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

    // Depends on totalPointsEarned (via isItemUnlocked), so this can't be a
    // module-level constant like GROUND_PICKER_ITEMS — recomputed only when
    // lifetime earnings actually change, not on every render.
    const pickerItems: PickerEntry[] = useMemo(
        () => [
            { id: REMOVE_TOOL_ID, label: 'Remove', cost: 0, icon: <Text style={{ fontSize: 22 }}>🗑️</Text> },
            ...CATALOG.filter((item) => getDecorationSprite(item.id, 'isometric')).map((item) => {
                const sprite = getDecorationSprite(item.id, 'isometric')!;
                const locked = !isItemUnlocked(state, item);
                return {
                    id: item.id,
                    label: item.label,
                    cost: item.cost,
                    icon: <AtlasSprite atlas={sprite.atlas} sprite={sprite.key} size={PICKER_ICON_SIZE} />,
                    locked,
                    lockedHint: locked ? `Unlocks at ${item.unlockThreshold} pts earned` : undefined,
                };
            }),
        ],
        [state.totalPointsEarned]
    );

    return (
        <SafeAreaView className={"flex-1 bg-sky"}>
            <View className="p-5">
                <Text className="text-xl font-bold text-success mb-2">Isometric Garden</Text>
                <Text className="text-mutedForeground mb-2">{state.points} pts · {state.totalPointsEarned} earned</Text>

                <Link href="/quest-page" style={{ color: '#6EE7B7', textDecorationLine: 'underline' }}>
                    Earn more points from Quests →
                </Link>

                {message && <Text className="text-warning mt-1">{message}</Text>}
            </View>

            <ModeToggle options={MODE_OPTIONS} selected={mode} onSelect={setMode} />

            {mode === 'decorate' ? (
                <ItemPicker
                    items={pickerItems}
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
                    flashIndex={invalidFlashIndex}
                    flashColor="#ef4444"
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
                        if (block === 'occupied') {
                            showMessage('Tile already has something — remove it first');
                            flashInvalid(index);
                        } else if (block === 'non-placeable-terrain') {
                            showMessage("Can't place on water");
                            flashInvalid(index);
                        } else if (block === 'locked') {
                            showMessage('Not unlocked yet');
                            flashInvalid(index);
                        } else if (block === 'insufficient-points') {
                            showMessage('Not enough points');
                            flashInvalid(index);
                        } else {
                            setPreviewIndex(index);
                        }
                    }}
                    renderGround={(index) => (
                        <AtlasSprite
                            atlas={isoBlocksAtlas}
                            sprite={getGroundSpriteKey(state.tiles[index].ground, index)}
                            size={TILE_WIDTH}
                        />
                    )}
                    renderDecoration={(index) => {
                        const tile = state.tiles[index];
                        const isPreview = index === previewIndex;
                        const itemId = isPreview ? selectedItemId : tile.item;
                        if (!itemId) return null;

                        const sprite = getDecorationSprite(itemId, 'isometric');
                        const catalogItem = getCatalogItem(itemId);
                        const decorationSize = TILE_WIDTH * (catalogItem?.visualScale ?? 1);

                        return (
                            <View style={isPreview ? { opacity: 0.55 } : undefined}>
                                {/* Reference box matching the tile's own TOP FACE — this tile
                                 set draws each tile as a pseudo-3D block (flat top + shaded
                                 sides, see the TILE_HEIGHT_STEP comment above), and a
                                 decoration should stand on the flat top, not at the base of
                                 the whole block. Anchoring to the full sprite height here
                                 (as an earlier version of this did, via an invisible copy of
                                 the ground sprite) put a decoration's visual base ~22px below
                                 the tile's own outline — barely noticeable before the outline
                                 existed, obviously wrong once it did (confirmed on-device: a
                                 bush's canopy sat straddling the outline's bottom vertex
                                 instead of standing inside it). */}
                                <View style={{ width: TILE_WIDTH, height: TILE_HEIGHT_STEP }} />

                                <View
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        alignSelf: 'center',
                                    }}
                                >
                                    <DecorationShadow size={decorationSize} />
                                    {sprite ? (
                                        <AtlasSprite
                                            atlas={sprite.atlas}
                                            sprite={sprite.key}
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
