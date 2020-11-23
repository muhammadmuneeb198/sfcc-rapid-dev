'use strict';

var page = module.superModule;
var server = require('server');
server.extend(page);

server.append('Show', function (req, res, next) {
    const {
        cartButtonEnabled,
        paypalCartButtonConfig,
        billingAgreementEnabled,
        staticImageLink,
        paypalPaymentMethodId,
        partnerAttributionId
    } = require('../config/paypalPreferences');
    var basket = require('dw/order/BasketMgr').getCurrentBasket();

    if (!basket || !paypalPaymentMethodId) {
        next();
        return;
    }
    const {
        getPaypalPaymentInstrument,
        removePaypalPaymentInstrument
    } = require('../scripts/paypal/helpers/paymentInstrumentHelper');
    const {
        removeBAfromSession
    } = require('../scripts/paypal/helpers/billingAgreementHelper');
    const {
        isExpiredTransaction
    } = require('../scripts/paypal/helpers/paypalHelper');
    const {
        createErrorMsg,
        createCartSDKUrl,
        getUrls
    } = require('../scripts/paypal/paypalUtils');
    const BillingAgreementModel = require('../models/billingAgreement');

    var paypalPaymentInstrument = getPaypalPaymentInstrument(basket);
    var paypalEmail = paypalPaymentInstrument && paypalPaymentInstrument.custom.currentPaypalEmail;
    var isUserHasSavedBA = false;
    var defaultBAemail;

    if (customer.authenticated && billingAgreementEnabled) {
        let billingAgreementModel = new BillingAgreementModel();
        isUserHasSavedBA = !empty(billingAgreementModel.getBillingAgreements());
        defaultBAemail = isUserHasSavedBA && billingAgreementModel.getDefaultBillingAgreement().email;
    }

    var isSdkRequired = !paypalEmail && !customer.authenticated
        || customer.authenticated && !paypalEmail && !billingAgreementEnabled
        || customer.authenticated && !paypalEmail && !isUserHasSavedBA && billingAgreementEnabled;

    if (isExpiredTransaction(paypalPaymentInstrument)) {
        removePaypalPaymentInstrument(basket);
        removeBAfromSession();
        res.setViewData({
            valid: {
                error: true,
                message: createErrorMsg('expiredpayment')
            },
            paypal: {
                sdkUrl: createCartSDKUrl(),
                cartButtonEnabled: cartButtonEnabled,
                buttonConfig: paypalCartButtonConfig,
                billingAgreementEnabled: billingAgreementEnabled
            }
        });
        return next();
    }

    res.setViewData({
        paypal: {
            sdkUrl: createCartSDKUrl(),
            partnerAttributionId: partnerAttributionId,
            cartButtonEnabled: cartButtonEnabled,
            buttonConfig: paypalCartButtonConfig,
            paypalEmail: paypalEmail,
            staticImageLink: staticImageLink,
            isUserHasSavedBA: isUserHasSavedBA,
            defaultBAemail: defaultBAemail,
            isPaypalInstrumentExist: paypalPaymentInstrument && !empty(paypalPaymentInstrument),
            billingAgreementEnabled: billingAgreementEnabled,
            isSdkRequired: isSdkRequired,
            paypalUrls: JSON.stringify(getUrls())
        }
    });
    next();
});

module.exports = server.exports();
