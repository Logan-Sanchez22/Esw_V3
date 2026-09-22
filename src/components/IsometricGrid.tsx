
import { ReactNode, useEffect, useRef, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
const EDGE_PADDING = 250;

type Props = {
    gridSize: number;
    tileWidth: number;
    tileHeightStep: number;
    /** The flat ground sprite for a tile. Ground tiles are drawn as one full pass,
     * entirely behind every decoration (see `renderDecoration`) — this is what stops
     * a "closer" tile's ground graphic from painting over a tall decoration behind it. */
    renderGround: (index: number, row: number, col: number) => ReactNode;
    /** What's planted/placed on a tile, or null/undefined for nothing. Decorations are
     * drawn in a second pass, on top of every ground tile, still back-to-front sorted
     * by row+col among themselves so two decorations still occlude each other correctly. */
    renderDecoration?: (index: number, row: number, col: number) => ReactNode | null | undefined;
    onTilePress?: (index: number, row: number, col: number) => void;
    /**
     * Outline color drawn on every tile's diamond edge — a diamond of
     * tileWidth x tileHeightStep, positioned identically to the ground tile
     * (see the position math below). tileHeightStep must equal this tile
     * set's real top-face height for the outline to trace the sprite's own
     * edge exactly (it does — pixel-measured; see the constant's definition
     * in garden.tsx). Getting this wrong once made neighboring outlines
     * overlap, visible as double/crossing lines — verified by simulating
     * both values against a multi-tile grid before fixing. Omit to skip
     * drawing tile outlines.
     */
    tileOutlineColor?: string;
    /** Opacity applied to the base per-tile outline ONLY — a highlighted or
     * flashed tile's own outline always stays fully opaque regardless of this,
     * since that's functional feedback, not ambient grid. Lets the parent dim
     * the grid by mode (see constants/theme.ts's gridOutlineOpacity) so the
     * garden reads as calmer to look at than to edit. Defaults to 1 (fully
     * visible) if omitted, matching this component's original behavior. */
    tileOutlineOpacity?: number;
    /** Index of one tile to outline with highlightColor instead (e.g. a placement preview). */
    highlightIndex?: number | null;
    highlightColor?: string;
    /** Index of one tile to fill (not just outline) with flashColor — a brief
     * "you can't place here" cue, distinct from highlightIndex's persistent
     * preview outline. */
    flashIndex?: number | null;
    flashColor?: string;
    /** Tiles to fill with a subtle dimColor tint — a proactive "these won't
     * work" cue shown continuously (e.g. every occupied/water tile while a
     * decoration is selected), distinct from flashIndex's brief reactive
     * flash after an actual blocked tap. A tile in both flashIndex and here
     * shows the flash, not the dim — flash is the more urgent, momentary signal. */
    dimIndices?: ReadonlySet<number>;
    dimColor?: string;
    /** Eases the camera to center on this tile once, when `token` changes —
     * a bump-free way for the parent to request a one-off pan without
     * fighting the gesture-driven translate/scale shared values below.
     * `token` (not `index` alone) is the trigger so re-flying to the same
     * tile twice in a row (e.g. two placements at the same spot) still
     * fires. Reusing the same withTiming-driven shared values the pan/pinch
     * gestures already animate, so it composes with them for free. */
    flyTo?: { index: number; token: number } | null;
};

function clampAxis(
    value: number,
    contentSize: number,
    viewportSize: number
) {
    'worklet';

    if (contentSize <= viewportSize) {
        return (viewportSize - contentSize) / 2;
    }

    const min = viewportSize - contentSize - EDGE_PADDING;
    const max = EDGE_PADDING;

    return Math.max(min, Math.min(max, value));
}

export function IsometricGrid({
                                  gridSize,
                                  tileWidth,
                                  tileHeightStep,
                                  renderGround,
                                  renderDecoration,
                                  onTilePress,
                                  tileOutlineColor,
                                  tileOutlineOpacity = 1,
                                  highlightIndex,
                                  highlightColor,
                                  flashIndex,
                                  flashColor,
                                  dimIndices,
                                  dimColor,
                                  flyTo,
                              }: Props) {
    const [viewport, setViewport] = useState({
        width: 0,
        height: 0,
    });

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    const handleLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;

        setViewport({ width, height });
    };

    const mapPixelWidth = gridSize * tileWidth;
    const mapPixelHeight = gridSize * tileHeightStep;

    const originOffsetX =
        (gridSize - 1) * (tileWidth / 2);

    const fullDiamondWidth = mapPixelWidth;
    const fullDiamondHeight =
        mapPixelHeight + tileHeightStep;

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const savedScale = useSharedValue(1);

    const containerRef = useRef<View>(null);

    // Set the initial position AFTER the container is measured.
    useEffect(() => {
        if (viewportWidth === 0 || viewportHeight === 0) {
            return;
        }

        const initialX =
            (viewportWidth - fullDiamondWidth) / 2;

        const initialY =
            (viewportHeight - fullDiamondHeight) / 2;

        translateX.value = initialX;
        translateY.value = initialY;

        savedTranslateX.value = initialX;
        savedTranslateY.value = initialY;

        scale.value = 1;
        savedScale.value = 1;
    }, [
        viewportWidth,
        viewportHeight,
        fullDiamondWidth,
        fullDiamondHeight,
    ]);

    const clampX = (value: number, currentScale: number) => {
        'worklet';

        return clampAxis(
            value,
            fullDiamondWidth * currentScale,
            viewportWidth
        );
    };

    const clampY = (value: number, currentScale: number) => {
        'worklet';

        return clampAxis(
            value,
            fullDiamondHeight * currentScale,
            viewportHeight
        );
    };

    // One-off "fly to" pan, requested by the parent (e.g. after confirming a
    // placement or move) — reads current scale, so it composes with whatever
    // zoom level the user already has rather than resetting it.
    useEffect(() => {
        if (!flyTo || viewportWidth === 0 || viewportHeight === 0) return;

        const row = Math.floor(flyTo.index / gridSize);
        const col = flyTo.index % gridSize;

        const tileX = (col - row) * (tileWidth / 2) + originOffsetX;
        const tileY = (col + row) * (tileHeightStep / 2);
        const centerX = tileX + tileWidth / 2;
        const centerY = tileY + tileHeightStep / 2;

        const currentScale = scale.value;
        const targetX = clampX(viewportWidth / 2 - centerX * currentScale, currentScale);
        const targetY = clampY(viewportHeight / 2 - centerY * currentScale, currentScale);

        translateX.value = withTiming(targetX, { duration: 450, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(targetY, { duration: 450, easing: Easing.out(Easing.cubic) });
        savedTranslateX.value = targetX;
        savedTranslateY.value = targetY;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flyTo?.token]);

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = clampX(
                savedTranslateX.value + e.translationX,
                scale.value
            );

            translateY.value = clampY(
                savedTranslateY.value + e.translationY,
                scale.value
            );
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            const next = Math.max(
                MIN_SCALE,
                Math.min(
                    MAX_SCALE,
                    savedScale.value * e.scale
                )
            );

            const centerX = viewportWidth / 2;
            const centerY = viewportHeight / 2;

            const contentX =
                (centerX - translateX.value) / scale.value;

            const contentY =
                (centerY - translateY.value) / scale.value;

            const scaledWidth =
                fullDiamondWidth * next;

            const scaledHeight =
                fullDiamondHeight * next;

            if (scaledWidth <= viewportWidth) {
                translateX.value =
                    (viewportWidth - scaledWidth) / 2;
            } else {
                translateX.value = clampX(
                    centerX - contentX * next,
                    next
                );
            }

            if (scaledHeight <= viewportHeight) {
                translateY.value =
                    (viewportHeight - scaledHeight) / 2;
            } else {
                translateY.value = clampY(
                    centerY - contentY * next,
                    next
                );
            }

            scale.value = next;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const composedGesture = Gesture.Simultaneous(
        panGesture,
        pinchGesture
    );

    const mapAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const groundTiles = [];
    const decorationTiles = [];
    // One shared canvas for every tile's outline, rather than one <Svg> per
    // tile — 225 independently-rasterized elements each rounded to their own
    // sub-pixel position produced hairline seams at shared vertices between
    // adjacent tiles, even though the underlying x/y math lines up exactly.
    // A single Svg means adjacent tiles' edges are drawn in one coordinate
    // space, so a shared vertex is one point, not two independently-rounded ones.
    const outlinePolygons: ReactNode[] = [];

    const positions: { row: number; col: number }[] = [];

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            positions.push({ row, col });
        }
    }

    positions.sort(
        (a, b) =>
            (a.row + a.col) - (b.row + b.col)
            || a.row - b.row
    );

    for (const { row, col } of positions) {
        const index = row * gridSize + col;

        const x =
            (col - row) * (tileWidth / 2)
            + originOffsetX;

        const y =
            (col + row) * (tileHeightStep / 2);

        groundTiles.push(
            <View
                key={index}
                style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: tileWidth,
                }}
                onTouchEnd={() =>
                    onTilePress?.(index, row, col)
                }
            >
                {renderGround(index, row, col)}
            </View>
        );

        const isDimmed = !!dimIndices?.has(index);

        if (tileOutlineColor || index === highlightIndex || index === flashIndex || isDimmed) {
            const isHighlight = index === highlightIndex;
            const isFlash = index === flashIndex;
            const cx = x + tileWidth / 2;
            const cy = y + tileHeightStep / 2;
            const points = `${cx},${y} ${x + tileWidth},${cy} ${cx},${y + tileHeightStep} ${x},${cy}`;

            outlinePolygons.push(
                <Polygon
                    key={`outline-${index}`}
                    points={points}
                    fill={isFlash ? flashColor : isDimmed ? dimColor : 'none'}
                    fillOpacity={isFlash ? 0.35 : isDimmed ? 0.4 : 1}
                    stroke={isHighlight ? highlightColor : isFlash ? flashColor : tileOutlineColor}
                    strokeWidth={isHighlight || isFlash ? 1.5 : 0.5}
                    strokeOpacity={isHighlight || isFlash ? 1 : tileOutlineOpacity}
                />
            );
        }

        const decoration = renderDecoration?.(index, row, col);

        if (decoration) {
            decorationTiles.push(
                <View
                    key={index}
                    style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: tileWidth,
                    }}
                >
                    {decoration}
                </View>
            );
        }
    }

    if (viewportWidth === 0 || viewportHeight === 0) {
        return (
            <View
                ref={containerRef}
                onLayout={handleLayout}
                style={{
                    flex: 1,
                    width: '100%',
                    overflow: 'hidden',
                }}
            />
        );
    }

    return (
        <View
            ref={containerRef}
            onLayout={handleLayout}
            style={{
                flex: 1,
                width: '100%',
                overflow: 'hidden',
            }}
        >
            <GestureDetector gesture={composedGesture}>
                <Animated.View
                    style={[
                        {
                            width: fullDiamondWidth,
                            height: fullDiamondHeight,
                            transformOrigin: 'top left',
                        },
                        mapAnimatedStyle,
                    ]}
                >
                    {groundTiles}
                    {outlinePolygons.length > 0 && (
                        <Svg
                            width={fullDiamondWidth}
                            height={fullDiamondHeight}
                            style={{ position: 'absolute', left: 0, top: 0 }}
                            pointerEvents="none"
                        >
                            {outlinePolygons}
                        </Svg>
                    )}
                    {/* pointerEvents="none" so taps fall through to the ground tile beneath —
                     * decorations are purely visual here, tap-to-place is handled by the
                     * ground layer's onTouchEnd above. */}
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: fullDiamondWidth,
                            height: fullDiamondHeight,
                        }}
                    >
                        {decorationTiles}
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}