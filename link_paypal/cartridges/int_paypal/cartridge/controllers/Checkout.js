'use strict';

var page = module.superModule;
var server = require('server');
var Money = require('dw/value/Money');
var BasketMgr = require('dw/order/BasketMgr');
var formatMoney = require('dw/util/StringUtils').formatMoney;

var {
    isExpiredTransaction
} = require('../scripts/paypal/helpers/paypalHelper');
var {
    getPaypalPaymentInstrument,
    removePaypalPaymentInstrument
} = require('../scripts/paypal/helpers/paymentInstrumentHelper');
const {
    removeBAfromSession,
    getBAFromSession
} = require('../scripts/paypal/helpers/billingAgreementHelper');
const { createBillingSDKUrl, getUrls } = require('../scripts/paypal/paypalUtils');
const BillingAgreementModel = require('../models/billingAgreement');
const prefs = require('../config/paypalPreferences');

server.extend(page);

server.append('Begin', function (_, res, next) {
    var basket = BasketMgr.getCurrentBasket();
    var currency = basket.getCurrencyCode();
    var paypalPaymentInstrument = getPaypalPaymentInstrument(basket);
    var paymentAmount = new Money(0, currency);
    let paypalOrderID = '';
    var amount;
    var isBALimitReached;
    var hasDefaultPaymentMethod;
    var savedPaypalBillingAgreements;
    var paypalEmail;

    if (isExpiredTransaction(paypalPaymentInstrument)) {
        removePaypalPaymentInstrument(basket);
        removeBAfromSession();
    }

    if (customer.authenticated && prefs.billingAgreementEnabled) {
        let billingAgreementModel = new BillingAgreementModel();
        savedPaypalBillingAgreements = billingAgreementModel.getBillingAgreements();
        isBALimitReached = billingAgreementModel.isBaLimitReached();
        hasDefaultPaymentMethod = !empty(savedPaypalBillingAgreements);
        if (!empty(session.privacy.baID)) {
            savedPaypalBillingAgreements.unshift(getBAFromSession());
            paypalEmail = session.privacy.baEmail;
        }
    }

    if (paypalPaymentInstrument) {
        amount = paypalPaymentInstrument.paymentTransaction.amount.value;
        paymentAmount = new Money(amount, currency);
        paypalEmail = paypalPaymentInstrument.custom.currentPaypalEmail;
        if (paypalPaymentInstrument.custom.paypalOrderID) {
            paypalOrderID = paypalPaymentInstrument.custom.paypalOrderID;
        }
    }

    res.setViewData({
        paypal: {
            paymentAmount: formatMoney(paymentAmount),
            prefs: prefs,
            paypalEmail: paypalEmail,
            partnerAttributionId: prefs.partnerAttributionId,
            buttonConfig: prefs.paypalBillingButtonConfig,
            customerPaypalPaymentInstruments: savedPaypalBillingAgreements,
            hasDefaultPaymentMethod: hasDefaultPaymentMethod,
            paypalOrderID: paypalOrderID,
            isBALimitReached: isBALimitReached,
            sdkUrl: createBillingSDKUrl(),
            paypalUrls: JSON.stringify(getUrls())
        }
    });
    next();
});

module.exports = server.exports();
