import pkg from '../../package.json'
import attachSocketIO from '../common/attachSocketIO'
import CompilerHandlerChain from '../common/CompilerHandlerChain'
import HapiRouteHandler from './HapiRouteHandler'

function registerHapiWebpackPlugin(
    server,
    {
        compiler,
        htmlSelectId,
        socketSelectId,
        socketIOPrefix,
        hot = false,
        watchDelay = 200,
        quiet = true,
        noInfo = true,
        devView,
        context = process.cwd()
    },
    next
) {
    const {outputPath} = compiler
    const {output} = compiler.options
    const {publicPath} = output
    const showInfo = !noInfo && !quiet
    const showStats = !quiet
    const statsOptions = {
        context
    }

    attachSocketIO({
        listeners: server.connections,
        compiler,
        socketIOPrefix,
        hot
    })

    const chain = new CompilerHandlerChain({
        statsOptions,
        showInfo,
        showStats,
        publicPath,
        outputPath,
        watchDelay
    })
    chain.attachToCompiler(compiler)

    const hapiRouteHandler = new HapiRouteHandler({
        fs: chain.getFs(),
        runHandler: chain.getHandlerRunner(),
        showInfo,
        devView
    })

    server.route({
        method: '*',
        path: '/{p*}',
        config: {
            handler: hapiRouteHandler.handler
        }
    })

    server.on('close', () => {
        chain.close()
    })

    next()
}

registerHapiWebpackPlugin.attributes = {pkg}

export default registerHapiWebpackPlugin
