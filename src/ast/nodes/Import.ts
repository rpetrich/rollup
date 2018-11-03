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

	renderFinalResolution(code: MagicString, resolution: string, options: RenderOptions) {
		// avoid unnecessary writes when tree-shaken
		if (this.rendered) {
			if (this.resolutionNamespace) {
				const _ = options.compact ? '' : ' ';
				const s = options.compact ? '' : ';';
				code.overwrite(
					this.parent.start,
					this.parent.end,
					`Promise.resolve().then(function${_}()${_}{${_}return ${
						this.resolutionNamespace
					}${s}${_}})`
				);
				return;
			}

			if (options.finaliser.finaliseDynamicImport) {
				options.finaliser.finaliseDynamicImport(code, {
					interop: this.resolutionInterop,
					compact: options.compact,
					importRange: this.parent,
					resolution,
					argumentRange: this.parent.arguments[0]
				});
			} else {
				code.overwrite(this.parent.arguments[0].start, this.parent.arguments[0].end, resolution);
			}
		}
	}

	render() {
		this.rendered = true;
	}

	setResolution(interop: boolean, namespace: string = undefined): void {
		this.rendered = false;
		this.resolutionInterop = interop;
		this.resolutionNamespace = namespace;
	}
}
