
import { Logform, format, transports, createLogger } from 'winston';
import util from 'util';
/*
// TODO: module labels for logging
import path from 'path';
const { combine, label } = format;


function getLabel(callingModule: string) {
    return path.basename(callingModule);
};

export function create(callingModule: string) {
    return createLogger({
        format: combine(
            label({ label: getLabel(callingModule) }),
            format.cli()
        ),
        transports: [new transports.Console()]
    });
}; */

export default createLogger({
    format: format.combine(
        utilFormatter(),
        format.cli(),
    ),
    transports: [new transports.Console()]
});

function utilFormatter(): Logform.Format {
    return {
        transform: (info: Logform.TransformableInfo) => {
            const args = info[Symbol.for('splat')];

            if (args) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                info.message = util.formatWithOptions({ colors: true, depth: 4 }, info.message, ...(Array.isArray(args) ? args : []));
            }
            return info;
        }
    };
}


