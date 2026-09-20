/** A single sprite's location within its source sheet, in raw pixel coordinates. */
export type SpriteRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/** A sheet is just a name -> rect lookup, plus the image source it belongs to. */
export type SpriteAtlas<Key extends string> = {
    source: any; // require(...) result for the sheet PNG
    sheetWidth: number;
    sheetHeight: number;
    sprites: Record<Key, SpriteRect>;
};
