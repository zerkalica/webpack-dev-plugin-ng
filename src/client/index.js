// @flow

import IO from 'socket.io-client'
import url from 'url'
import stripAnsi from 'strip-ansi'
import getSocketPath from '../common/getSocketPath'

function createHandlers() {
    let hot: bool = false
    let initial: bool = true
    let currentHash: string = ''

    function reloadApp() {
        if (initial) {
            return
        }
        initial = false

        if(hot) {
            console.log('[WDS] App hot update...')
            window.postMessage(`webpackHotUpdate${currentHash}`, '*')
        } else {
            console.log('[WDS] App updated. Reloading...')
            window.location.reload()
        }
    }

    function showArray(strings: string[]): void {
        for(let i = 0; i < strings.length; i++) {
            console.warn(stripAnsi(strings[i]))
        }
    }

    const IOHandlers = {
        hot() {
            hot = true
            console.log('[WDS] Hot Module Replacement enabled.')
        },
        invalid() {
            console.log('[WDS] App updated. Recompiling...')
        },
        hash(hash: string) {
            currentHash = hash
        },
        'still-ok'() {
            console.log('[WDS] Nothing changed.')
        },
        ok() {
            reloadApp()
        },
        warnings(warnings) {
            console.log('[WDS] Warnings while compiling.')
            showArray(warnings)
            reloadApp()
        },
        errors(errors) {
            console.log('[WDS] Errors while compiling.')
            showArray(errors)
            reloadApp()
        },
        'proxy-error'(errors) {
            console.log('[WDS] Proxy error.')
            showArray(errors)
            reloadApp()
        },
        disconnect() {
            console.error('[WDS] Disconnected!')
        }
    }

    return IOHandlers
}

function getClientUriFromDocument(window): string {
    const scriptElements = window.document.getElementsByTagName('script')
    const __resourceQuery = window.__resourceQuery || null

    let uri: string = typeof __resourceQuery === 'string' && __resourceQuery
        ? __resourceQuery.substr(1)
        : scriptElements[scriptElements.length - 1]
            .getAttribute('src')
            .replace(/\/[^\/]+$/, '')

    if (!uri) {
        uri = window.location.origin
    }

    return uri
}

function createSocketIO(uri: string) {
    const parts = {
        protocol: '',
        ...url.parse(uri)
    }

    if (!parts.path || !parts.host) {
        throw new Error(`path is not found in url ${uri}`)
    }

    const socketPath: string = getSocketPath(uri)
    const connectPath: string = parts.protocol
        + (parts.slashes ? '//' : '')
        + parts.host

    const io = IO.connect(connectPath, {
        path: socketPath
    })

    console.log(`[WDS] connected to ${connectPath}, socketPath: ${socketPath}`)

    return io
}

function attachHandlers(io, handlers: Object): () => void {
    const keys = Object.keys(handlers)
    keys.forEach((key: string) => io.on(key, handlers[key]))
    return () => {}
}

function main(window) {
    const uri: string = getClientUriFromDocument(window)
    const io = createSocketIO(uri)
    const IOHandlers = createHandlers()
    return attachHandlers(io, IOHandlers)
}

main(window)
