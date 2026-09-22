import { ReactNode, useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
// Extra pixels you can pan past the map's true edge, into blue background,
// before hitting the hard stop — makes the boundary feel natural instead
// of an abrupt wall exactly at the last tile.
const EDGE_PADDING = 250;

type Props = {
    gridSize: number;
    tileSize: number;
    /** Height reserved above the viewport for header/points text, so the grid fills the rest of the screen. */
    headerHeight?: number;
    renderTile: (index: number) => ReactNode;
    /** Eases the camera to center on this tile once, when `token` changes — see IsometricGrid's identical prop. */
    flyTo?: { index: number; token: number } | null;
    /**
     * A decorative border drawn just outside the tile grid's own bounds, so
     * the map reads as a bounded plot instead of an unbounded tile canvas
     * dropped into the background. Purely a background layer positioned via
     * negative offsets — it never changes mapSize itself, so none of the
     * pan/zoom clamping math above is affected by it.
     */
    edgeFrame?: { width: number; color: string };
};

/** Centers content along one axis when it's smaller than the viewport (rather than
 pinning to 0/top-left), and clamps normally to cover the viewport edge-to-edge
 once content is bigger than the viewport — with EDGE_PADDING extra room past
 the true edge before the hard stop. */
function clampAxis(value: number, contentSize: number, viewportSize: number) {
    'worklet';
    if (contentSize <= viewportSize) {
        return (viewportSize - contentSize) / 2;
    }
    const min = viewportSize - contentSize - EDGE_PADDING;
    const max = EDGE_PADDING;
    return Math.max(min, Math.min(max, value));
}

/**
 * Full-screen pannable + pinch-zoomable tile grid viewport. Shared by both
 * garden.tsx and garden-alt.tsx — the pan/zoom/clamping behavior must stay
 * identical between the two art styles, so it lives here once.
 */
export function PannableGrid({ gridSize, tileSize, headerHeight = 0, renderTile, flyTo, edgeFrame }: Props) {
    const { width: viewportWidth, height: windowHeight } = useWindowDimensions();
    const viewportHeight = windowHeight - headerHeight;
    const mapSize = gridSize * tileSize;

    const initialX = clampAxisJS(0, mapSize, viewportWidth);
    const initialY = clampAxisJS(0, mapSize, viewportHeight);

    const translateX = useSharedValue(initialX);
    const translateY = useSharedValue(initialY);
    const scale = useSharedValue(1);
    const savedTranslateX = useSharedValue(initialX);
    const savedTranslateY = useSharedValue(initialY);
    const savedScale = useSharedValue(1);

    const clampX = (value: number, currentScale: number) => {
        'worklet';
        return clampAxis(value, mapSize * currentScale, viewportWidth);
    };
    const clampY = (value: number, currentScale: number) => {
        'worklet';
        return clampAxis(value, mapSize * currentScale, viewportHeight);
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
            // Keep the viewport's center point visually fixed in content-space as
            // scale changes, instead of scaling around the content's own center
            // (which drifts once you've panned away from the middle).
            const centerX = viewportWidth / 2;
            const centerY = viewportHeight / 2;
            const contentX = (centerX - translateX.value) / scale.value;
            const contentY = (centerY - translateY.value) / scale.value;
            translateX.value = clampX(centerX - contentX * next, next);
            translateY.value = clampY(centerY - contentY * next, next);
            scale.value = next;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    // One-off "fly to" pan, requested by the parent (e.g. after confirming a
    // placement or move) — see IsometricGrid's identical effect.
    useEffect(() => {
        if (!flyTo) return;

        const row = Math.floor(flyTo.index / gridSize);
        const col = flyTo.index % gridSize;
        const centerX = col * tileSize + tileSize / 2;
        const centerY = row * tileSize + tileSize / 2;

        const currentScale = scale.value;
        const targetX = clampX(viewportWidth / 2 - centerX * currentScale, currentScale);
        const targetY = clampY(viewportHeight / 2 - centerY * currentScale, currentScale);

        translateX.value = withTiming(targetX, { duration: 450, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(targetY, { duration: 450, easing: Easing.out(Easing.cubic) });
        savedTranslateX.value = targetX;
        savedTranslateY.value = targetY;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flyTo?.token]);

    const mapAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <View style={{ width: viewportWidth, height: viewportHeight, overflow: 'hidden' }}>
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[{ width: mapSize, height: mapSize }, mapAnimatedStyle]}>
                    {edgeFrame && (
                        <View
                            pointerEvents="none"
                            style={{
                                position: 'absolute',
                                left: -edgeFrame.width,
                                top: -edgeFrame.width,
                                width: mapSize + edgeFrame.width * 2,
                                height: mapSize + edgeFrame.width * 2,
                                backgroundColor: edgeFrame.color,
                            }}
                        />
                    )}
                    <View style={{ width: mapSize, height: mapSize, flexDirection: 'row', flexWrap: 'wrap' }}>
                        {Array.from({ length: gridSize * gridSize }).map((_, i) => (
                            <View key={i} style={{ width: tileSize, height: tileSize }}>
                                {renderTile(i)}
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

// Plain (non-worklet) version for computing the initial JS-side shared value.
function clampAxisJS(value: number, contentSize: number, viewportSize: number) {
    if (contentSize <= viewportSize) {
        return (viewportSize - contentSize) / 2;
    }
    const min = viewportSize - contentSize - EDGE_PADDING;
    const max = EDGE_PADDING;
    return Math.max(min, Math.min(max, value));
}
