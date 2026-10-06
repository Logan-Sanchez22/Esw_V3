// Tells TypeScript how to type an `import image from './something.png'`
// statement — without this, TypeScript has no idea what a ".png" file even
// is and would refuse to compile any `require('...png')`/`import` of one
// (which this app does constantly — see every atlas file under
// src/lib/atlases/, constants/images.ts, etc). `const value: any` is a
// deliberately loose type: the actual value Metro (React Native's bundler)
// produces for an image import is a bundler-specific number/object, not
// something worth modeling precisely here.
declare module "*.png" {
    const value: any;
    export default value;
}
declare module "*.jpg" {
    const value: any;
    export default value;
}
declare module "*.jpeg" {
    const value: any;
    export default value;
}
declare module "*.svg" {
    const value: any;
    export default value;
}
declare module "*.gif" {
    const value: any;
    export default value;
}