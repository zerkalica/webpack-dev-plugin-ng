// @flow

import Boom from 'boom'

export default function createDevView({staticPagesMask, templatePath, templateVars}: {
    staticPagesMask?: RegExp,
    templatePath: string
}) {
    return function devView(request: Object, reply: Function) {
        if (staticPagesMask && !request.path.match(staticPagesMask)) {
            return reply(Boom.notFound(`Static page ${request.path}`))
        }

        return reply.view(templatePath, {
            templateVars: templateVars || {},
            info: request.connection.info,
            payload: JSON.stringify(request.payload || {}, null, '  ')
        })
    }
}
