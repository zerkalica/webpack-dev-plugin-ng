# webpack-dev-plugin-ng

Webpack dev plugin with hot-reloading for hapi.

Example dev server deps:

```bash
npm install --save-dev hapi vision inert handlebars webpack webpack-dev-plugin-ng find-root copy-webpack-plugin empty webpack-stats-plugin source-map json-loader babel-loader node-config-loader style-loader stack-source-map
```

Example dev server:

```js
import {Server} from 'hapi'

import Vision from 'vision'
import Inert from 'inert'
import handlebars from 'handlebars'

import {createHapiWebpackPlugin} from 'webpack-dev-plugin-ng/hapi'
import webpack from 'webpack'

import config from './webpack.config'

const server = new Server()

const templatePath = path.resolve(__dirname, 'index.html')
const staticPagesMask = new RegExp('^/(index|confirm|wait)?(\.html)?$', 'g')

function createDevView({staticPagesMask, templatePath}) {
    return function devView(request, reply) {
        if (staticPagesMask && !request.path.match(staticPagesMask)) {
            return reply(Boom.notFound(`Static page ${request.path}`))
        }

        return reply.view(templatePath, {
            info: request.connection.info,
            payload: JSON.stringify(request.payload || {}, null, '  ')
        })
    }
}


server.register(
  [
    Vision,
    Inert,
    createWebpackPlugin({
      config,
      webpack,
      hot: true,
      devView: createDevView({staticPagesMask, templatePath})
    })
  ], (err?: Error) => {
    server.views({
      allowAbsolutePaths: true,
      compileOptions: {
          noEscape: true
      },
      engines: {
          html: handlebars
      }
    })
  }
)
```


Example html template:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8"/>
    <title>dev app</title>
  </head>
  <body>
    <div id="app"></div>
    <script>
      window.PostData = {{payload}}
    </script>
    <script src="/app.js"></script>
  </body>
</html>
```

Example webpack.config:

```js

import path from 'path'
import fr from 'find-root'

import {
    DefinePlugin,
    NormalModuleReplacementPlugin,
    optimize
} from 'webpack'
import CopyPlugin from 'copy-webpack-plugin'
import {StatsWriterPlugin} from 'webpack-stats-plugin'

const debugStubPath: string = require.resolve('empty/functionThatReturns')
const {version, name} = require(path.resolve(fr(__dirname), 'package.json'))

const isProduction: boolean = process.env.NODE_ENV === 'production'

const styleOptions: string [] = [
    'singleton'
]

const cssOptions: string[] = [
    'autoprefixer',
    (isProduction ? '-' : '') + 'sourceMap',
    (isProduction ? '' : '-') + 'minimize'
]

const fallback = []
if (process.env.NVM_PATH) {
    fallback.push(path.resolve(process.env.NVM_PATH, '..', 'node_modules'))
}
fallback.push(path.resolve(__dirname, '..', 'node_modules'))

function createStyleLoaders(...args: any[]): string[] {
    const styleLoader = 'style?' + styleOptions.join('&')
    const cssLoader = 'css?' + cssOptions.join('&')
    return [styleLoader, cssLoader].concat(args)
}

const main: string = 'app.js'

const commonEntries = isProduction
    ? []
    : [
        'stack-source-map/register'
    ]

export default {
    cwd: path.resolve(__dirname, '..'),
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
        path: path.resolve(__dirname, '..', 'dist'),
        filename: main
    },
    entry: {
        'browser': commonEntries.concat([
            path.resolve(__dirname, '..', 'src', 'browser.js')
        ])
    },
    configLoader: {
        env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        instance: process.env.PROFILE || 'client'
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
                test: /.*\.configloaderrc$/,
                loader: 'node-config-loader/webpack'
            },
            {
                test: /\.json$/,
                loaders: ['json-loader']
            },
            {
                test: /\.(?:jsx?|es6)$/,
                include: /(?:src)/,
                exclude: /(?:node_modules|bower_components)/,
                loaders: ['babel-loader'] // 'react-hot-loader'
            },
            {
                test: /\.(?:png|jpg|gif|ico)$/,
                loader: 'file?name=assets/[name].[ext]'
            },
            {
                test: /\.(?:eot|woff|woff2|ttf|svg)(?:\?v\=[\d\w\.]+)?$/,
                loader: 'file?name=assets/[name].[ext]'
            },
            {
                test: /\.styl$/,
                include: /(?:assets)/,
                loaders: createStyleLoaders('stylus')
            },
            {
                test: /\.css$/,
                include: /(?:assets)/,
                loaders: createStyleLoaders()
            }
        ]
    },
    plugins: [
        new StatsWriterPlugin({
            filename: 'build.json',
            transform: (meta, opts) => JSON.stringify({name, version, main, ...meta}, null, '  '),
            fields: ['hash', 'errors', 'warnings', 'assets']
        }),
        new DefinePlugin({
            'process.env': {
                __VERSION__: JSON.stringify(version),
                IS_BROWSER: true,
                NODE_ENV: JSON.stringify(process.env.NODE_ENV)
            }
        }),
        new CopyPlugin([
            {
                from: '../assets/*',
                to: 'assets'
            }
        ])
    ]
    .concat(isProduction
        ? [
            new optimize.DedupePlugin(),
            new optimize.OccurenceOrderPlugin(),
            new optimize.UglifyJsPlugin({
                compress: {
                    warnings: false
                }
            }),
            new NormalModuleReplacementPlugin(/^debug$/, debugStubPath)
        ]
        : [
        ]
    )
}
```
