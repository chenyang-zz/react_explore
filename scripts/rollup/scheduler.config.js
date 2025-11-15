import { getBaseRollupPlugins, getPackageJSON, resolvePkgPath } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPackageJSON(
    'scheduler'
);
// scheduler包路径
const pkgPath = resolvePkgPath(name);
// scheduler产物路径
const pkgDistPath = resolvePkgPath(name, true);

export default [
    // scheduler
    {
        input: `${pkgPath}/${module}`,
        output: [
            {
                file: `${pkgDistPath}/index.js`,
                name: 'Scheduler',
                format: 'umd'
            }
        ],
        plugins: [
            ...getBaseRollupPlugins(),
            // resolve alias
            generatePackageJson({
                inputFolder: pkgPath,
                outputFolder: pkgDistPath,
                baseContents: ({ name, description, version }) => ({
                    name,
                    description,
                    version,
                    main: 'index.js',
                })
            })
        ]
    }
];
