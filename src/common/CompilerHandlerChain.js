// @flow

import MemoryFileSystem from 'memory-fs'
import url from 'url'

class Callbacks {
    _cbs: Function[] = []
    _isStateValid: boolean = false

    setStateValid(isStateValid: boolean): void {
        this._isStateValid = isStateValid
    }

    isStateValid(): boolean {
        return this._isStateValid
    }

    add = (fn: Function) => this._add(fn)

    _add(fn: Function) {
        if (this._isStateValid) {
            fn()
        } else {
            this._cbs.push(fn)
        }
    }

    run(...args): void {
        this._cbs.forEach((fn: Function) => fn(...args))
        this._cbs = []
    }
}


function normalizePath(url: string): string {
    let result: string
    if (url.indexOf('/') !== 0) {
        result = '/' + url
    } else {
        result = url
    }
    return result
}

class MemoryFs {
    _localPrefix: string
    _outputPath: string
    _fs: MemoryFileSystem

    constructor(rec: {
        publicPath: string,
        outputPath: string
    }) {
        const {pathname} = url.parse(rec.publicPath)
        this._localPrefix = pathname || ''
        this._outputPath = rec.outputPath || ''
        this._fs = new MemoryFileSystem()
    }

    getFs(): MemoryFileSystem {
        return this._fs
    }

    readFile(file: string): string|boolean {
        const fs = this._fs
        let filename = file
        let isFile = false
        try {
            const stat = fs.statSync(filename)
            isFile = stat.isFile()
            if (!isFile && stat.isDirectory()) {
                filename = filename + '/index.html'
                isFile = fs.statSync(filename).isFile()
            }
        } catch (e) {
            isFile = false
        }

        return isFile ? fs.readFileSync(filename) : false
    }

    getFilenameFromUrl(link: string): string {
        const localPrefix = this._localPrefix
        const outputPath = this._outputPath
        const {pathname} = url.parse(link)

        return outputPath + normalizePath((pathname || '').substring(localPrefix.length))
    }
}

export default class CompilerHandlerChain {
    _callbacks: Callbacks
    _showInfo: boolean
    _showStats: boolean
    _watchDelay: number
    _fs: MemoryFs
    _watchHandler: any
    _statsOptions: Object

    constructor({
        showInfo,
        showStats,
        publicPath,
        outputPath,
        watchDelay,
        statsOptions = {}
    }: {
        showInfo?: boolean,
        showStats?: boolean,
        publicPath: string,
        outputPath: string,
        watchDelay?: number,
        statsOptions: Object
    }) {
        this._statsOptions = statsOptions
        this._showInfo = showInfo || false
        this._showStats = showStats || false
        this._watchDelay = watchDelay || 300
        this._callbacks = new Callbacks()
        this._fs = new MemoryFs({
            publicPath,
            outputPath
        })
    }

    getHandlerRunner() {
        return this._callbacks.add
    }

    getFs() {
        return this._fs
    }

    attachToCompiler(compiler: Object) {
        const callbacks = this._callbacks
        const showInfo = this._showInfo
        const showStats = this._showStats
        const watchDelay = this._watchDelay
        const statsOptions = this._statsOptions

        compiler.outputFileSystem = this.getFs().getFs()
        compiler.plugin('done', statsData => {
            // We are now on valid state
            callbacks.setStateValid(true)
            // Do the stuff in nextTick, because bundle may be invalidated
            //  if a change happend while compiling
            process.nextTick(() => {
                // check if still in valid state
                if (callbacks.isStateValid()) {
                    // print webpack output
                    if (
                        showStats
                        && !statsData.hasErrors()
                        && !statsData.hasWarnings()
                    ) {
                        console.log(statsData.toString(statsOptions))
                    }

                    if (showInfo) {
                        console.info('webpack: bundle is now VALID.')
                    }

                    // execute callback that are delayed
                    callbacks.run()
                }
            })
        })

        // on compiling
        function invalidPlugin() {
            if (callbacks.isStateValid() && showInfo) {
                console.info('webpack: bundle is now INVALID.')
            }
            // We are now in invalid state
            callbacks.setStateValid(false)
        }

        compiler.plugin('invalid', invalidPlugin)
        compiler.plugin('compile', invalidPlugin)

        this._watchHandler = compiler.watch(watchDelay, err => {
            if (err) {
                throw err
            }
        })
    }

    close(): Promise<void> {
        const watchHandler = this._watchHandler

        return new Promise((resolve, reject) => {
            if (watchHandler) {
                watchHandler.close(resolve)
            } else {
                resolve()
            }
        })
    }

    invalidate(): void {
        if (this._watchHandler) {
            this._watchHandler.invalidate()
        }
    }
}
