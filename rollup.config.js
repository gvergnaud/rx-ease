import babel from 'rollup-plugin-babel'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const createConfig = (input, output, additionnalPlugins = []) => ({
  input,
  output: {
    file: output,
    format: 'cjs'
  },
  plugins: [
    nodeResolve({
      jsnext: true
    }),
    commonjs({
      include: 'node_modules/**'
    }),
    babel({
      exclude: 'node_modules/**'
    }),
    ...additionnalPlugins
  ],
  external: ['rxjs']
})

export default createConfig('src/index.ts', 'lib/index.js')
