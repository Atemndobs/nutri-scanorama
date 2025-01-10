declare module 'image-js' {
  export class Image {
    static load(buffer: ArrayBuffer): Image;
    data: Uint8Array;
  }
}
