import { Bundle as MagicStringBundle } from 'magic-string';
import { FinaliserOptions, OutputOptions } from '../rollup/types';
import error from '../utils/error';
import { isLegal } from '../utils/identifierHelpers';
import getInteropBlock from './shared/getInteropBlock';
import { keypath } from './shared/sanitize';
import setupNamespace from './shared/setupNamespace';
import trimEmptyImports from './shared/trimEmptyImports';
import warnOnBuiltins from './shared/warnOnBuiltins';

const thisProp = (name: string) => `this${keypath(name)}`;

export const name = 'iife';
export const requiresGlobalName = true;

export function finalise(
	magicString: MagicStringBundle,
	{
		namedExportsMode,
		hasExports,
		indentString: t,
		intro,
		outro,
		dependencies,
		preferConst,
		onwarn,
		generateExportBlock
	}: FinaliserOptions,
	options: OutputOptions
) {
	const _ = options.compact ? '' : ' ';
	const n = options.compact ? '' : '\n';

	const { extend, name } = options;
	const isNamespaced = name && name.indexOf('.') !== -1;
	const possibleVariableAssignment = !extend && !isNamespaced;

	if (name && possibleVariableAssignment && !isLegal(name)) {
		error({
			code: 'ILLEGAL_IDENTIFIER_AS_NAME',
			message: `Given name (${name}) is not legal JS identifier. If you need this you can try --extend option`
		});
	}

	warnOnBuiltins(onwarn, dependencies);

	const external = trimEmptyImports(dependencies);
	const deps = external.map(dep => dep.globalName || 'null');
	const args = external.map(m => m.name);

	if (hasExports && !name) {
		error({
			code: 'INVALID_OPTION',
			message: `You must supply output.name for IIFE bundles`
		});
	}

	if (extend) {
		deps.unshift(`(${thisProp(name)}${_}=${_}${thisProp(name)}${_}||${_}{})`);
		args.unshift('exports');
	} else if (namedExportsMode && hasExports) {
		deps.unshift('{}');
		args.unshift('exports');
	}

	const useStrict = options.strict !== false ? `${t}'use strict';${n}${n}` : ``;

	let wrapperIntro = `(function${_}(${args})${_}{${n}${useStrict}`;

	if (hasExports && !extend) {
		const varOrConst = preferConst ? 'const' : 'var';
		wrapperIntro =
			(isNamespaced ? thisProp(name) : `${varOrConst} ${name}`) + `${_}=${_}${wrapperIntro}`;
	}

	if (isNamespaced) {
		wrapperIntro =
			setupNamespace(name, 'this', false, options.globals, options.compact) + wrapperIntro;
	}

	let wrapperOutro = `${n}${n}}(${deps}));`;

	if (!extend && namedExportsMode && hasExports) {
		wrapperOutro = `${n}${n}${t}return exports;${wrapperOutro}`;
	}

	// var foo__default = 'default' in foo ? foo['default'] : foo;
	const interopBlock = getInteropBlock(dependencies, options, preferConst);
	if (interopBlock) magicString.prepend(interopBlock + n + n);

	if (intro) magicString.prepend(intro);

	const exportBlock = generateExportBlock();
	if (exportBlock) magicString.append(n + n + exportBlock);
	if (outro) magicString.append(outro);

	return magicString
		.indent(t)
		.prepend(wrapperIntro)
		.append(wrapperOutro);
}
