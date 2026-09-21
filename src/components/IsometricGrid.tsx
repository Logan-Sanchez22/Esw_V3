
import { ReactNode, useEffect, useRef, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
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
     * Height (top point to bottom point, in the same rendered pixels as
     * tileWidth) of the ground sprite's flat TOP FACE diamond — this tile
     * set draws each tile as a pseudo-3D block (flat top + shaded sides), so
     * the top face is shorter than the full sprite. Pixel-measured per atlas,
     * not derived from tileHeightStep (that's the grid's row/col overlap
     * step, a different number). Omit to skip drawing tile outlines.
     */
    topFaceHeight?: number;
    /** Outline color drawn on every tile's top-face diamond edge. */
    tileOutlineColor?: string;
    /** Index of one tile to outline with highlightColor instead (e.g. a placement preview). */
    highlightIndex?: number | null;
    highlightColor?: string;
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
                                  topFaceHeight,
                                  tileOutlineColor,
                                  highlightIndex,
                                  highlightColor,
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

        if (topFaceHeight && (tileOutlineColor || index === highlightIndex)) {
            const isHighlight = index === highlightIndex;

            groundTiles.push(
                <View
                    key={`outline-${index}`}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        left: x,
                        top: y,
                        width: tileWidth,
                        height: topFaceHeight,
                    }}
                >
                    <Svg width={tileWidth} height={topFaceHeight}>
                        <Polygon
                            points={`${tileWidth / 2},0 ${tileWidth},${topFaceHeight / 2} ${tileWidth / 2},${topFaceHeight} 0,${topFaceHeight / 2}`}
                            fill="none"
                            stroke={isHighlight ? highlightColor : tileOutlineColor}
                            strokeWidth={isHighlight ? 2 : 1}
                        />
                    </Svg>
                </View>
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