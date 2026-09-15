import { ReactNode, useRef, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
const EDGE_PADDING = 250;

type Props = {
    gridSize: number;
    tileWidth: number;
    tileHeightStep: number;
    renderTile: (index: number, row: number, col: number) => ReactNode;
    onTilePress?: (index: number, row: number, col: number) => void;
};

/** Same centering fix as PannableGrid, plus EDGE_PADDING extra pannable room
 past the true edge before the hard stop. */
function clampAxis(value: number, contentSize: number, viewportSize: number) {
    'worklet';
    if (contentSize <= viewportSize) {
        return (viewportSize - contentSize) / 2;
    }
    const min = viewportSize - contentSize - EDGE_PADDING;
    const max = EDGE_PADDING;
    return Math.max(min, Math.min(max, value));
}
function clampAxisJS(value: number, contentSize: number, viewportSize: number) {
    if (contentSize <= viewportSize) {
        return (viewportSize - contentSize) / 2;
    }
    const min = viewportSize - contentSize - EDGE_PADDING;
    const max = EDGE_PADDING;
    return Math.max(min, Math.min(max, value));
}

/**
 * True diamond isometric grid. Each tile's screen position depends on BOTH
 * its row and column simultaneously:
 *   screenX = (col - row) * (tileWidth / 2)
 *   screenY = (col + row) * (tileHeightStep / 2)
 * Intentionally separate from PannableGrid (top-down) — different art needs
 * different positioning math, not just different sprites.
 */
export function IsometricGrid({
                                  gridSize,
                                  tileWidth,
                                  tileHeightStep,
                                  renderTile,
                                  onTilePress,
                              }: Props) {
    const [viewport, setViewport] = useState({
        width: 0,
        height: 0,
    });

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    const handleLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;

        setViewport({
            width,
            height,
        });
    };

    const mapPixelWidth = gridSize * tileWidth; // half-span; full diamond span is x2
    const mapPixelHeight = gridSize * tileHeightStep;
    const originOffsetX = (gridSize - 1) * (tileWidth / 2);
    const fullDiamondWidth = mapPixelWidth;
    const fullDiamondHeight = mapPixelHeight + tileHeightStep;

    const initialX = (viewportWidth - fullDiamondWidth) / 2;
    const initialY = (viewportHeight - fullDiamondHeight) / 2;


    const translateX = useSharedValue(initialX);
    const translateY = useSharedValue(initialY);
    const scale = useSharedValue(1);
    const savedTranslateX = useSharedValue(initialX);
    const savedTranslateY = useSharedValue(initialY);
    const savedScale = useSharedValue(1);
    const containerRef = useRef<View>(null);

    const clampX = (value: number, currentScale: number) => {
        'worklet';
        return clampAxis(value, fullDiamondWidth * currentScale, viewportWidth);
    };
    const clampY = (value: number, currentScale: number) => {
        'worklet';
        return clampAxis(value, fullDiamondHeight * currentScale, viewportHeight);
    };

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = clampX(savedTranslateX.value + e.translationX, scale.value);
            translateY.value = clampY(savedTranslateY.value + e.translationY, scale.value);
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, savedScale.value * e.scale));
            const centerX = viewportWidth / 2;
            const centerY = viewportHeight / 2;
            const contentX = (centerX - translateX.value) / scale.value;
            const contentY = (centerY - translateY.value) / scale.value;
            const scaledWidth = fullDiamondWidth * next;
            const scaledHeight = fullDiamondHeight * next;

            if (scaledWidth <= viewportWidth) {
                translateX.value = (viewportWidth - scaledWidth) / 2;
            } else {
                translateX.value = clampX(
                    centerX - contentX * next,
                    next
                );
            }

            if (scaledHeight <= viewportHeight) {
                translateY.value = (viewportHeight - scaledHeight) / 2;
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

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const mapAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    // Draw back-to-front by (row + col) so nearer tiles (and their decorations,
    // like trees) correctly render OVER farther tiles. Plain row-major order
    // does not guarantee this for a diamond grid — e.g. row1/col0 must draw
    // before row0/col13, but row-major would draw it after, hiding a tall
    // decoration on row1/col0 behind row0/col13's tile.
    const tiles = [];
    const positions: { row: number; col: number }[] = [];
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            positions.push({ row, col });
        }
    }
    positions.sort((a, b) => (a.row + a.col) - (b.row + b.col) || a.row - b.row);

    for (const { row, col } of positions) {
        const index = row * gridSize + col;
        const x = (col - row) * (tileWidth / 2) + originOffsetX;
        const y = (col + row) * (tileHeightStep / 2);
        tiles.push(
            <View
                key={index}
                style={{ position: 'absolute', left: x, top: y, width: tileWidth }}
                onTouchEnd={() => onTilePress?.(index, row, col)}
            >
                {renderTile(index, row, col)}
            </View>
        );
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
                    style={[{ width: fullDiamondWidth, height: fullDiamondHeight }, mapAnimatedStyle]}
                >
                    {tiles}
                </Animated.View>
            </GestureDetector>
        </View>
    );
}
