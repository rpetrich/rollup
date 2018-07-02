import { Finaliser } from '../rollup/types';
import * as amd from './amd';
import * as cjs from './cjs';
import * as esm from './esm';
import * as iife from './iife';
import * as system from './system';
import * as umd from './umd';

export default { system, amd, cjs, es: esm, iife, umd } as {
	[format: string]: Finaliser;
};
