import mime from 'mime'
import Boom from 'boom'
export default class HapiRouteHandler {
    constructor({
        fs,
        runHandler,
        showInfo = true,
        headers = {},
        devView = null
    }) {
        this._fs = fs
        this._headers = headers
        this._runHandler = runHandler
        this.handler = ::this.handler
        this._showInfo = showInfo
        this._devView = devView
    }

    handler(req, reply) {
        const fs = this._fs
        const runHandler = this._runHandler
        const showInfo = this._showInfo
        const headers = this._headers
        const dv = this._devView
        const filename = fs.getFilenameFromUrl(req.url.path)
        if (!filename) {
            return reply.continue()
        }

        if (showInfo) {
            console.log('webpack: wait until bundle finished: ' + filename)
        }

        function onHapiRouteRequestHandler() {
            const content = fs.readFile(filename)
            if (content === false) {
                return dv ? dv(req, reply) : reply(Boom.notFound(`${filename} not found`))
            }
            if (showInfo) {
                console.log('webpack: loading ' + filename)
            }

            const locHeaders = {
                'Access-Control-Allow-Origin': '*',
                'x-hapi-webpack-dev': 'true',
                'Content-Type': mime.lookup(filename),
                ...headers,
            }

            const res = reply(content)
            Object.keys(locHeaders).forEach(name => {
                res.header(name, locHeaders[name])
            })
        }

        runHandler(onHapiRouteRequestHandler)
    }
}
