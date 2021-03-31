// @ts-check
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { fromRollup } from '@web/dev-server-rollup';

import _commonjs from '@rollup/plugin-commonjs';

const commonjs = fromRollup(_commonjs);

/** @type {import('@web/test-runner').TestRunnerConfig} */
export default ({
  nodeResolve: true,

  files: 'test/*.test.ts',

  plugins: [
    commonjs({ exclude: '**/chai/chai.js', ignoreDynamicRequires: false }),
    esbuildPlugin({ ts: true }),
  ],
});
