import type { SpriteAtlas } from '@/lib/sprite-atlas-types';

export type IsoBlockKey =
    | 'grassFlat'
    | 'grassMushroom'
    | 'grassSparkle1'
    | 'grassMoleHill'
    | 'grassPlain2'
    | 'grassSparkle2'
    | 'grassDirtEdge1'
    | 'grassDirtEdge2'
    | 'grassDirtEdge3'
    | 'grassDirtEdge4'
    | 'grassDirtEdge5'
    | 'grassDirtEdge6'
    | 'soilGrassCorner'
    | 'soilGrassTuft'
    | 'soilPlain1'
    | 'soilSpeckled1'
    | 'soilSpeckled2'
    | 'soilPlain2'
    | 'waterPlain'
    | 'waterRipple'
    | 'waterMossPatch'
    | 'waterRockMoss1'
    | 'waterRockMoss2'
    | 'waterRockMoss3'
    | 'waterReeds'
    | 'waterRock1'
    | 'waterRock2'
    | 'waterRock3'
    | 'waterRock4'
    | 'waterRockMoss4'
    | 'waterRockCluster1'
    | 'waterRockCluster2'
    | 'waterRockCluster3'
    | 'waterRockCluster4'
    | 'waterRockCluster5'
    | 'waterRockCluster6'
    | 'stonePathGrass1'
    | 'stonePathGrass2'
    | 'stonePathGrass3'
    | 'stonePathGrass4'
    | 'stonePathGrass5'
    | 'stonePathGrass6'
    | 'stonePathGrass7'
    | 'stonePathPlain1'
    | 'stonePathPlain2'
    | 'stonePathSparkle'
    | 'stonePathPlain3'
    ;

export const isoBlocksAtlas: SpriteAtlas<IsoBlockKey> = {
    source: require('@/assets/images/garden/blocks.png'),
    sheetWidth: 216,
    sheetHeight: 270,
    sprites: {
        grassFlat: { x: 6, y: 4, width: 30, height: 27 },
        grassMushroom: { x: 41, y: 4, width: 30, height: 27 },
        grassSparkle1: { x: 76, y: 4, width: 31, height: 27 },
        grassMoleHill: { x: 111, y: 4, width: 31, height: 27 },
        grassPlain2: { x: 146, y: 4, width: 30, height: 27 },
        grassSparkle2: { x: 180, y: 4, width: 31, height: 27 },
        grassDirtEdge1: { x: 6, y: 36, width: 30, height: 28 },
        grassDirtEdge2: { x: 41, y: 36, width: 30, height: 28 },
        grassDirtEdge3: { x: 76, y: 36, width: 31, height: 28 },
        grassDirtEdge4: { x: 111, y: 36, width: 31, height: 28 },
        grassDirtEdge5: { x: 146, y: 36, width: 30, height: 28 },
        grassDirtEdge6: { x: 180, y: 36, width: 31, height: 28 },
        soilGrassCorner: { x: 6, y: 68, width: 30, height: 27 },
        soilGrassTuft: { x: 41, y: 68, width: 30, height: 27 },
        soilPlain1: { x: 76, y: 68, width: 31, height: 27 },
        soilSpeckled1: { x: 111, y: 68, width: 31, height: 27 },
        soilSpeckled2: { x: 146, y: 68, width: 30, height: 27 },
        soilPlain2: { x: 180, y: 68, width: 31, height: 27 },
        waterPlain: { x: 6, y: 98, width: 30, height: 29 },
        waterRipple: { x: 41, y: 98, width: 30, height: 29 },
        waterMossPatch: { x: 76, y: 98, width: 31, height: 29 },
        waterRockMoss1: { x: 111, y: 98, width: 31, height: 29 },
        waterRockMoss2: { x: 146, y: 98, width: 30, height: 29 },
        waterRockMoss3: { x: 180, y: 98, width: 31, height: 29 },
        waterReeds: { x: 6, y: 131, width: 30, height: 32 },
        waterRock1: { x: 41, y: 131, width: 30, height: 32 },
        waterRock2: { x: 76, y: 131, width: 31, height: 32 },
        waterRock3: { x: 111, y: 131, width: 31, height: 32 },
        waterRock4: { x: 146, y: 131, width: 30, height: 32 },
        waterRockMoss4: { x: 180, y: 131, width: 31, height: 32 },
        waterRockCluster1: { x: 6, y: 166, width: 30, height: 31 },
        waterRockCluster2: { x: 41, y: 166, width: 30, height: 31 },
        waterRockCluster3: { x: 76, y: 166, width: 31, height: 31 },
        waterRockCluster4: { x: 111, y: 166, width: 31, height: 31 },
        waterRockCluster5: { x: 146, y: 166, width: 30, height: 31 },
        waterRockCluster6: { x: 180, y: 166, width: 31, height: 31 },
        stonePathGrass1: { x: 6, y: 204, width: 30, height: 27 },
        stonePathGrass2: { x: 41, y: 204, width: 30, height: 27 },
        stonePathGrass3: { x: 76, y: 204, width: 31, height: 27 },
        stonePathGrass4: { x: 111, y: 204, width: 31, height: 27 },
        stonePathGrass5: { x: 146, y: 204, width: 30, height: 27 },
        stonePathGrass6: { x: 180, y: 204, width: 31, height: 27 },
        stonePathGrass7: { x: 6, y: 237, width: 30, height: 27 },
        stonePathPlain1: { x: 41, y: 237, width: 30, height: 27 },
        stonePathPlain2: { x: 76, y: 237, width: 31, height: 27 },
        stonePathSparkle: { x: 111, y: 237, width: 31, height: 27 },
        stonePathPlain3: { x: 146, y: 237, width: 30, height: 27 },
    },
};