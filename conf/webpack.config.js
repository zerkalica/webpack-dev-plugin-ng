import path from 'path'

import {
    DefinePlugin,
    NormalModuleReplacementPlugin,
    optimize
} from 'webpack'

const root = path.resolve(__dirname, '..')

function normalizeEnv(from: string): string {
    switch (from) {
        case 'production':
            return 'prod'
        case 'development':
            return 'dev'
        case 'testing':
            return 'test'
        default:
            return from
    }
}

const env: string = normalizeEnv(process.env.NODE_ENV)

const isProduction: boolean = env === 'prod'

const fallback = []
if (process.env.NVM_PATH) {
    fallback.push(path.resolve(process.env.NVM_PATH, '..', 'node_modules'))
}
fallback.push(path.resolve(root, 'node_modules'))

const commonEntries = isProduction
    ? []
    : []

export default {
    cwd: root,
    cache: !isProduction,
    debug: !isProduction,
    devtool: isProduction ? '' : 'source-map',
    resolve: {
        fallback
    },
    resolveLoader: {
        fallback
    },
    output: {
        publicPath: '/',
        path: path.resolve(root, 'dist', 'client'),
        filename: 'index.js'
    },
    entry: {
        'client': commonEntries.concat([
            path.resolve(root, 'src', 'client', 'index.js')
        ])
    },
    module: {
        preLoaders: [
            {
                test: /\.js$/,
                exclude: ['src', 'lib'],
                loaders: ['source-map']
            }
        ],
        loaders: [
            {
                test: /\.(?:jsx?|es6)$/,
                include: /(?:src)/,
                exclude: /(?:node_modules|bower_components)/,
                loaders: ['babel-loader'] // 'react-hot-loader'
            }
        ]
    },
    plugins: [
        new DefinePlugin({
            'process.env': {
                IS_BROWSER: true,
                NODE_ENV: JSON.stringify(process.env.NODE_ENV)
            }
        })
    ]
}
