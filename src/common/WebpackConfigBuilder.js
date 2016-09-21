// @flow
import __debug from 'debug'
import path from 'path'
import fr from 'find-root'
import url from 'url'
import createProgressPlugin from './createProgressPlugin'

const clientPath: string = path.join(fr(__dirname), 'dist', 'client')

const debug = __debug('hapi-webpack-dev-plugin:createWebpack:debug')

export type WebpackConfig = Object
export type HotModuleReplacementPlugin = Function
export type Webpack = Function

export default class WebpackConfigBuilder {
    _hmr: HotModuleReplacementPlugin
    _clientPath: string
    _publicPath: string
    _config: WebpackConfig
    _webpack: Class<Webpack>
    _wpInstance: Webpack
    _webpackConfig: WebpackConfig

    isHot: boolean

    from: {
        href: string;
        pathname: string;
    };

    constructor(
        webpackConfig: WebpackConfig,
        webpack: Class<Webpack>
    ) {
        this._clientPath = clientPath
        this._publicPath = webpackConfig.output.publicPath
        this._webpackConfig = webpackConfig
        this._webpack = webpack
        this._hmr = webpack.HotModuleReplacementPlugin
        this.isHot = false
        this.from = {
            pathname: '',
            ...url.parse(this._publicPath)
        }
    }

    getWebpack(): Webpack {
        if (this._wpInstance) {
            return this._wpInstance
        }
        const config = this._webpackConfig

        debug('context: %s', config.context)
        debug('entry: %o', config.entry)
        debug('publicPath, %s', config.output.publicPath)

        this._wpInstance = this._webpack(config)

        return this._wpInstance
    }

    addProgress(): WebpackConfigBuilder {
        this._webpackConfig.plugins.push(createProgressPlugin(this._webpack))
        return this
    }

    addHot(): WebpackConfigBuilder {
        const config = this._webpackConfig
        const entry: Object|Array<*> = config.entry
        let newEntry: {[id: string]: mixed} | mixed[]
        const devClient: mixed[] = [
            this._clientPath + '?' + this.from.href,
            'webpack/hot/dev-server'
        ]

        if(typeof entry === 'object' && !Array.isArray(entry)) {
            newEntry = {}
            Object.keys(entry).forEach((key: string) => {
                (newEntry: any)[key] = devClient.concat(entry[key])
            })
        } else {
            newEntry = devClient.concat(config.entry)
        }

        this.isHot = true

        this._webpackConfig = {
            ...config,
            plugins: [
                new this._hmr()
            ].concat(config.plugins),
            output: {
                ...config.output || {},
                publicPath: this.from.href + '/'
            },
            entry: newEntry
        }

        return this
    }
}
