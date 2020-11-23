
'use strict';

let paypalLogger;

/**
 * Get logger instance
 *
 * @param {msg} msg Error message
 */
function createErrorLog(msg) {
    var Logger = require('dw/system/Logger');
    paypalLogger = paypalLogger || Logger.getLogger('PayPal-BM', 'PayPal_General');
    if (!empty(msg)) {
        paypalLogger.error(msg);
    } else {
        paypalLogger.debug('Empty log entry');
    }
    return;
}

module.exports = {
    createErrorLog: createErrorLog
};
