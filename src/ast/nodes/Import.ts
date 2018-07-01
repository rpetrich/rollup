import MagicString from 'magic-string';
import { RenderOptions } from '../../utils/renderHelpers';
import CallExpression from './CallExpression';
import * as NodeType from './NodeType';
import { NodeBase } from './shared/Node';

export default class Import extends NodeBase {
	type: NodeType.tImport;
	parent: CallExpression;

	private resolutionNamespace: string;
	private resolutionInterop: boolean;
	private rendered: boolean;

	initialise() {
		this.included = false;
		this.resolutionNamespace = undefined;
		this.resolutionInterop = false;
		this.rendered = false;
		this.context.addDynamicImport(this);
	}

	renderFinalResolution(code: MagicString, resolution: string) {
		// avoid unnecessary writes when tree-shaken
		if (this.rendered)
			code.overwrite(this.parent.arguments[0].start, this.parent.arguments[0].end, resolution);
	}

	render(code: MagicString, options: RenderOptions) {
		this.rendered = true;
		if (this.resolutionNamespace) {
			const _ = options.compact ? '' : ' ';
			const s = options.compact ? '' : ';';
			code.overwrite(
				this.parent.start,
				this.parent.end,
				`Promise.resolve().then(function${_}()${_}{${_}return ${this.resolutionNamespace}${s}${_}})`
			);
			return;
		}

		if (options.finaliser.dynamicImportMechanism) {
			const importMechanism = options.finaliser.dynamicImportMechanism(
				this.resolutionInterop,
				options.compact
			);
			code.overwrite(this.parent.start, this.parent.arguments[0].start, importMechanism.left);
			code.overwrite(this.parent.arguments[0].end, this.parent.end, importMechanism.right);
		}
	}

	setResolution(interop: boolean, namespace: string = undefined): void {
		this.rendered = false;
		this.resolutionInterop = interop;
		this.resolutionNamespace = namespace;
	}
}
