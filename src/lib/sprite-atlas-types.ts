// Beginner orientation: game/app art is often shipped as one big image (a
// "sprite sheet" or "atlas") containing many small pictures packed
// together, rather than one separate image file per picture — fewer files
// to load, and the art tool that exported it laid them out this way. To
// draw just one small picture from that sheet, you need to know where it
// sits: its (x, y) position and its (width, height) size, in pixels, from
// the sheet's top-left corner. That's exactly what SpriteRect records.
// src/components/AtlasSprite.tsx is the component that actually takes one
// of these rects and crops/displays just that piece of the sheet.
//
// The files in src/lib/atlases/ each define one SpriteAtlas: a sheet (an
// image file, via `require(...)`) plus a named lookup of every sprite
// that's been identified on it so far. The numbers in each file were found
// by inspecting the real image pixel-by-pixel (see each file's own
// comments) — they're deliberate measurements, not guesses, so don't
// hand-edit them without re-checking against the actual source PNG.

/** A single sprite's location within its source sheet, in raw pixel coordinates. */
export type SpriteRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/** A sheet is just a name -> rect lookup, plus the image source it belongs to. */
// `<Key extends string>` is a "generic type constraint": SpriteAtlas can be
// used with any Key type, as long as that Key is (or extends) a string —
// in practice, Key is always one of the string-literal-union sprite-name
// types defined in each atlas file below (e.g. IsoBlockKey). This is what
// lets `sprites.waterPlain` autocomplete and type-check in your editor,
// instead of `sprites` just being "an object with string keys, who knows what's in it."
export type SpriteAtlas<Key extends string> = {
    source: any; // require(...) result for the sheet PNG
    sheetWidth: number;
    sheetHeight: number;
    sprites: Record<Key, SpriteRect>;
};
