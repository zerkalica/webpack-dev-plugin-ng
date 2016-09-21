export default function createProgressPlugin(webpack) {
    let chars = 0

    function goToLineStart(nextMessage) {
        let str = ''
        nextMessage = nextMessage || ''
        for (; chars > nextMessage.length; chars--) {
            str += '\b \b'
        }
        chars = nextMessage.length;

        for (let i = 0; i < chars; i++) {
            str += '\b'
        }

        if (str) {
            process.stderr.write(str)
        }
    }

    return new webpack.ProgressPlugin((percentage, msg) => {
        msg = msg || ''
        percentage = percentage || 0
        if (percentage < 1) {
            percentage = Math.floor(percentage * 100) || ''
            msg = percentage + '% ' + msg
            if (percentage < 100) {
                msg = ' ' + msg
            }
            if (percentage < 10) {
                msg = ' ' + msg
            }
        }

        goToLineStart(msg);
        process.stderr.write(msg)
    })
}
