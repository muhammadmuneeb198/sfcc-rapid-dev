'use strict';
/* global empty dw request session customer */

var paypalHelper = {};

paypalHelper.createCustomTransactionInvNum = function () {
    var OrderMgr = require('dw/order/OrderMgr');
    var invNum = OrderMgr.createOrderSequenceNo();

    try {
        if (!empty(OrderMgr.getOrder(invNum))) {
            invNum = OrderMgr.createOrderSequenceNo();
        }
    } catch (error) {
        require('./bmPaypalUtils').createErrorLog(error);
    }

    return 'pp_' + invNum;
};

module.exports = paypalHelper;
