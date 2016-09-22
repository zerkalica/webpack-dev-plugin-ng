// @flow
import __debug from 'debug'
import path from 'path'
import fr from 'find-root'
import url from 'url'
import createProgressPlugin from './createProgressPlugin'
import getSocketPath from './getSocketPath'

const clientPath: string = path.join(fr(__dirname), 'dist', 'client')

const debug = __debug('webpack-dev-plugin-ng:createWebpack:debug')

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
    _from: string

    isHot: boolean
    socketPath: string

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
        this.socketPath = getSocketPath(this._publicPath)
        debug('socketPath: %s', this.socketPath)
        this._from = url.parse(this._publicPath).href
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
            this._clientPath + '?' + this._from,
            'webpack/hot/dev-server'
        ]
        debug('new entries: %s', devClient.join('\n'))

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
                publicPath: this._from
            },
            entry: newEntry
        }

        debug('wp output: %s', JSON.stringify(this._webpackConfig.output, null, '  '))
        debug('wp entry: %s', JSON.stringify(this._webpackConfig.entry, null, '  '))

        return this
    }
}
