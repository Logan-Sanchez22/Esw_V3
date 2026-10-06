// GLOBAL TYPE DECLARATIONS — a ".d.ts" file (as opposed to a plain ".ts"
// one) only declares types, it has no actual runtime code, and TypeScript
// automatically includes every ".d.ts" file in the project without
// needing an import statement anywhere. `declare global { ... }` is what
// makes the interfaces inside available EVERYWHERE in the app by their
// bare name (`AppTab`, `TabIconProps`) — no `import` line needed, same as
// using a built-in type like `string`. The empty `export {}` at the
// bottom is a required bit of boilerplate: it's what tells TypeScript this
// file is a "module" (so `declare global` is even allowed) rather than a
// plain script.
declare global {
    interface AppTab {
        name: string;
        title: string;
        // A single emoji glyph — matches the icon language used everywhere
        // else in the app (buttons, empty states, quest cards), see
        // constants/data.ts.
        icon: string;
    }

    interface TabIconProps {
        focused: boolean;
        icon: string;
    }
}

export {};