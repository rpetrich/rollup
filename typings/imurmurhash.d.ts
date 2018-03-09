declare module 'imurmurhash' {
	export default class MurmurHash3 {
		constructor(initialText?: string, seed?: number);
		hash(text: string): this;
		result(): number;
		reset(seed?: number): this;
	}
}
