// @flow

import socketIO from 'socket.io'

function sendStats(emit, stats, force) {
    if (
        !force
        && (!stats.errors || stats.errors.length === 0)
        && stats.assets && stats.assets.every(asset => !asset.emitted)
    ) {
        return emit('still-ok')
    }

    emit('hash', stats.hash)
    if(stats.errors.length > 0) {
        emit('errors', stats.errors);
    } else if(stats.warnings.length > 0) {
        emit('warnings', stats.warnings)
    } else {
        emit('ok')
    }
}

function attachToListener({server, listener, getState, socketPath, hot}) {
    const io = socketIO.listen(listener, {
        'log level': 2,
        path: socketPath
    })
    io.sockets.on('connection', socket => {
        const emit = socket.emit.bind(socket)
        if (hot) {
            emit('hot')
        }
        const state = getState()
        if (state) {
            sendStats(emit, state, true)
        }
    })

    return io
}

function attachToCompiler({compiler, emit, setState}) {
    const invalidPlugin = () => emit('invalid')
    compiler.plugin('compile', invalidPlugin)
    compiler.plugin('invalid', invalidPlugin)
    compiler.plugin('done', statsObj => {
        const stats = statsObj.toJson()
        sendStats(emit, stats)
        setState(stats)
    })
}

class State<S> {
    _state: S
    getState: () => S = () => this._state
    setState: (state: S) => void = (state: S) => {
        this._state = state
    }
}

function attachToListeners({
    listeners,
    getState,
    socketPath,
    hot
}) {
    const ios = listeners.map(({listener}) => attachToListener({
        listener,
        getState,
        socketPath,
        hot
    }))

    return {
        emit(...args) {
            ios.forEach(io => io.sockets.emit(...args))
        }
    }
}

function attachSocketIO({
    listeners,
    compiler,
    socketPath,
    hot
}: {
    listeners: Function[],
    compiler: Object,
    socketPath: string,
    hot: string
}): void {
    const state = new State()
    const {emit} = attachToListeners({
        listeners,
        getState: state.getState,
        socketPath,
        hot
    })

    attachToCompiler({
        compiler,
        emit,
        setState: state.setState
    })
}

export default attachSocketIO
