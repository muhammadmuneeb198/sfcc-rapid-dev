'use strict';

var page = module.superModule;
var server = require('server');

const OrderMgr = require('dw/order/OrderMgr');

server.extend(page);

server.append('Confirm', function (req, res, next) {
    var { getPaypalPaymentInstrument } = require('../scripts/paypal/helpers/paymentInstrumentHelper');
    var formatMoney = require('dw/util/StringUtils').formatMoney;
    var Money = require('dw/value/Money');

    var order = OrderMgr.getOrder(req.querystring.ID);
    var paypalPaymentInstrument = getPaypalPaymentInstrument(order);
    var currency = order.getCurrencyCode();

    if (!paypalPaymentInstrument) {
        next();
        return;
    }
    var amount = paypalPaymentInstrument.paymentTransaction.amount.value;
    var paypalEmail = paypalPaymentInstrument.custom.currentPaypalEmail;
    var paymentAmount = formatMoney(new Money(amount, currency));
    res.setViewData({
        paypal: {
            paypalEmail: paypalEmail,
            paymentAmount: paymentAmount
        }
    });
    next();
});

server.append('Details', function (req, res, next) {
    var order = OrderMgr.getOrder(req.querystring.orderID);
    res.setViewData({
        paypal: {
            summaryEmail: null,
            currency: order.getCurrencyCode()
        }
    });
    next();
});

module.exports = server.exports();
