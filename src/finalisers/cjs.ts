import { Bundle as MagicStringBundle } from 'magic-string';
import MagicString from 'magic-string';
import { FinaliserDynamicImportOptions, FinaliserOptions, OutputOptions } from '../rollup/types';
import { compactEsModuleExport, esModuleExport } from './shared/esModuleExport';

export const name = 'cjs';
export const supportsCodeSplitting = true;

export function finaliseDynamicImport(
	magicString: MagicString,
	{ interop, compact, importRange, argumentRange }: FinaliserDynamicImportOptions
) {
	const _ = compact ? '' : ' ';
	let left;
	let right;
	if (interop) {
		left = `Promise.resolve({${_}default:${_}require(`;
		right = `)${_}})`;
	} else {
		left = 'Promise.resolve(require(';
		right = '))';
	}
	magicString.overwrite(importRange.start, argumentRange.start, left);
	magicString.overwrite(argumentRange.end, importRange.end, right);
}

export function finalise(
	magicString: MagicStringBundle,
	{
		isEntryModuleFacade,
		namedExportsMode,
		hasExports,
		intro,
		outro,
		dependencies,
		preferConst,
		generateExportBlock
	}: FinaliserOptions,
	options: OutputOptions
) {
	const n = options.compact ? '' : '\n';
	const _ = options.compact ? '' : ' ';

	intro =
		(options.strict === false ? intro : `'use strict';${n}${n}${intro}`) +
		(namedExportsMode && hasExports && isEntryModuleFacade && options.esModule
			? `${options.compact ? compactEsModuleExport : esModuleExport}${n}${n}`
			: '');

	let needsInterop = false;

	const varOrConst = preferConst ? 'const' : 'var';
	const interop = options.interop !== false;

	let importBlock: string;

	if (options.compact) {
		let definingVariable = false;
		importBlock = '';

		dependencies.forEach(
			({
				id,
				namedExportsMode,
				isChunk,
				name,
				reexports,
				imports,
				exportsNames,
				exportsDefault
			}) => {
				if (!reexports && !imports) {
					importBlock += definingVariable ? ';' : ',';
					definingVariable = false;
					importBlock += `require('${id}')`;
				} else {
					importBlock += definingVariable ? ',' : `${importBlock ? ';' : ''}${varOrConst} `;
					definingVariable = true;

					if (!interop || isChunk || !exportsDefault || !namedExportsMode) {
						importBlock += `${name}=require('${id}')`;
					} else {
						needsInterop = true;
						if (exportsNames)
							importBlock += `${name}=require('${id}'),${name}__default=_interopDefault(${name})`;
						else importBlock += `${name}=_interopDefault(require('${id}'))`;
					}
				}
			}
		);
		if (importBlock.length) importBlock += ';';
	} else {
		importBlock = dependencies
			.map(
				({
					id,
					namedExportsMode,
					isChunk,
					name,
					reexports,
					imports,
					exportsNames,
					exportsDefault
				}) => {
					if (!reexports && !imports) return `require('${id}');`;

					if (!interop || isChunk || !exportsDefault || !namedExportsMode)
						return `${varOrConst} ${name} = require('${id}');`;

					needsInterop = true;

					if (exportsNames)
						return (
							`${varOrConst} ${name} = require('${id}');` +
							`\n${varOrConst} ${name}__default = _interopDefault(${name});`
						);

					return `${varOrConst} ${name} = _interopDefault(require('${id}'));`;
				}
			)
			.join('\n');
	}

	if (needsInterop) {
		if (options.compact)
			intro += `function _interopDefault(e){return(e&&(typeof e==='object')&&'default'in e)?e['default']:e}`;
		else
			intro += `function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }\n\n`;
	}

	if (importBlock) intro += importBlock + n + n;

	const exportBlock = generateExportBlock(`module.exports${_}=${_}`);

	magicString.prepend(intro);

	if (exportBlock) magicString.append(n + n + exportBlock);
	if (outro) magicString.append(outro);

	return magicString;
}
