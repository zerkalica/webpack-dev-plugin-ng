// @flow

import url from 'url'

export default function getSocketPath(uri: string): string {
    const p: string = url.parse(uri).pathname || ''

    const slash: string = p[p.length - 1] === '/' ? '' : '/'
    const socketPath: string = `${p}${slash}socket.io`
    return socketPath
}
