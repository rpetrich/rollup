import { Bundle as MagicStringBundle } from 'magic-string';
import MagicString from 'magic-string';
import { FinaliserDynamicImportOptions, FinaliserOptions, OutputOptions } from '../rollup/types';
import { compactEsModuleExport, esModuleExport } from './shared/esModuleExport';
import getInteropBlock from './shared/getInteropBlock';
import warnOnBuiltins from './shared/warnOnBuiltins';

export const name = 'amd';
export const supportsCodeSplitting = true;

export function finaliseDynamicImport(
	magicString: MagicString,
	{ interop, compact, resolution, importRange, argumentRange }: FinaliserDynamicImportOptions
) {
	const _ = compact ? '' : ' ';
	const resolve = compact ? 'c' : 'resolve';
	const reject = compact ? 'e' : 'reject';
	let left;
	let right;
	if (interop) {
		left = `new Promise(function${_}(${resolve},${_}${reject})${_}{${_}require([`;
		right = `],${_}function${_}(m)${_}{${_}${resolve}({${_}default:${_}m${_}})${_}},${_}${reject})${_}})`;
	} else {
		left = `new Promise(function${_}(${resolve},${_}${reject})${_}{${_}require([`;
		right = `],${_}${resolve},${_}${reject})${_}})`;
	}
	magicString.overwrite(importRange.start, argumentRange.start, left);
	magicString.overwrite(argumentRange.end, importRange.end, right);
	magicString.overwrite(argumentRange.start, argumentRange.end, resolution);
}

export function finalise(
	magicString: MagicStringBundle,
	{
		namedExportsMode,
		hasExports,
		indentString,
		intro,
		outro,
		dynamicImport,
		needsAmdModule,
		dependencies,
		isEntryModuleFacade,
		preferConst,
		onwarn,
		generateExportBlock
	}: FinaliserOptions,
	options: OutputOptions
) {
	warnOnBuiltins(onwarn, dependencies);

	const deps = dependencies.map(m => `'${m.id}'`);
	const args = dependencies.map(m => m.name);
	const n = options.compact ? '' : '\n';
	const _ = options.compact ? '' : ' ';

	if (namedExportsMode && hasExports) {
		args.unshift(`exports`);
		deps.unshift(`'exports'`);
	}

	if (dynamicImport) {
		args.unshift('require');
		deps.unshift(`'require'`);
	}

	if (needsAmdModule) {
		args.unshift('module');
		deps.unshift(`'module'`);
	}

	const amdOptions = options.amd || {};

	const params =
		(amdOptions.id ? `'${amdOptions.id}',${_}` : ``) +
		(deps.length ? `[${deps.join(`,${_}`)}],${_}` : ``);

	const useStrict = options.strict !== false ? `${_}'use strict';` : ``;
	const define = amdOptions.define || 'define';
	const wrapperStart = `${define}(${params}function${_}(${args.join(
		`,${_}`
	)})${_}{${useStrict}${n}${n}`;

	// var foo__default = 'default' in foo ? foo['default'] : foo;
	const interopBlock = getInteropBlock(dependencies, options, preferConst);
	if (interopBlock) magicString.prepend(interopBlock + n + n);

	if (intro) magicString.prepend(intro);

	const exportBlock = generateExportBlock();
	if (exportBlock) magicString.append(n + n + exportBlock);
	if (namedExportsMode && hasExports && isEntryModuleFacade && options.esModule)
		magicString.append(`${n}${n}${options.compact ? compactEsModuleExport : esModuleExport}`);
	if (outro) magicString.append(outro);

	return magicString
		.indent(indentString)
		.append(n + n + '});')
		.prepend(wrapperStart);
}
