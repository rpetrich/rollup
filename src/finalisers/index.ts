import * as system from './system';
import * as amd from './amd';
import * as cjs from './cjs';
import * as es from './es';
import * as iife from './iife';
import * as umd from './umd';
import { Finaliser } from '../rollup/index';

export default { system, amd, cjs, es, iife, umd } as {
	[format: string]: Finaliser;
};
