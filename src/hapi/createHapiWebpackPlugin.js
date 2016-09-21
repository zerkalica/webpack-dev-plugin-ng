// @flow
import registerHapiWebpackPlugin from './registerHapiWebpackPlugin'
import WebpackConfigBuilder from '../common/WebpackConfigBuilder'
import type {WebpackConfig, Webpack} from '../common/WebpackConfigBuilder'

type HapiPlugin = Object
type HapiRequest = Object
type HapiReply = Object

export default function createHapiWebpackPlugin(
    {config, webpack, devView, hot, progress}: {
        config: WebpackConfig,
        webpack: Webpack,
        devView?: (req: HapiRequest, reply: HapiReply) => void,
        hot?: boolean,
        progress?: boolean
    }
): HapiPlugin {
    const cb = new WebpackConfigBuilder(config, webpack)
    if (hot) {
        cb.addHot()
    }
    if (progress) {
        cb.addProgress()
    }
    return {
        register: registerHapiWebpackPlugin,
        options: {
            compiler: cb.getWebpack(),
            quiet: false,
            hot: cb.isHot,
            noInfo: false,
            socketIOPrefix: cb.from.pathname,
            devView
        }
    }
}
