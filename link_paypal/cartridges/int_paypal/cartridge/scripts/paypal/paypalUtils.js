
'use strict';

const Encoding = require('dw/crypto/Encoding');
const Bytes = require('dw/util/Bytes');
const URLUtils = require('dw/web/URLUtils');
const Resource = require('dw/web/Resource');
const {
    billingAgreementEnabled,
    isCapture,
    enabledLPMs
} = require('../../config/paypalPreferences');
let {
    disableFunds,
    allowedCurrencies
} = require('../../config/sdkConfig');
let paypalLogger;

/**
 * Gets the disabled funding sources
 *
 * @returns {array} of disbled funding sources
 */
function disabledPaymentOptions() {
    if (empty(enabledLPMs)) {
        return disableFunds;
    }
    let lpmMethods = enabledLPMs.map(function (lpm) {
        return lpm.toLowerCase();
    });

    if (empty(lpmMethods)) {
        return disableFunds;
    }

    disableFunds = disableFunds.filter(function (fund) {
        return Array.indexOf(lpmMethods, fund) === -1;
    });
    return disableFunds;
}


/**
 * Gets client id from cache if it exists or creates it, saves to cache and returns from cache
 *
 * @returns {string} with client id
 */
function getClientId() {
    const prefsCache = require('dw/system/CacheMgr').getCache('paypalPreferences');
    const serviceName = 'int_paypal.http.rest';
    var clientId = prefsCache.get('clientId');
    if (clientId) return clientId;
    const restService = require('dw/svc/LocalServiceRegistry').createService(serviceName, {});
    clientId = restService.configuration.credential.user;
    prefsCache.put('clientId', clientId);
    return clientId;
}

/**
 * Encodes purchase unit object into encoded string
 *
 * @param {Object} purchaseUnit purchase unit
 * @returns {string} encoded string
 */
function encodeString(purchaseUnit) {
    const bytes = new Bytes(JSON.stringify(purchaseUnit));
    return Encoding.toBase64(bytes);
}

/**
 * Determine if current currency supported by PP SDK
 * @param  {Array} allowedCurrenciesFromPP Allowed currencies for PP SDK
 * @param  {string} storeCurrency Current session currency
 * @returns {Boolen} Currency match state
 */
function isAllowedCurrency(allowedCurrenciesFromPP, storeCurrency) {
    return allowedCurrenciesFromPP.some(function (allowedCurrency) {
        return allowedCurrency === storeCurrency;
    });
}

/**
 * Creates SDK url for paypal button on billing page based on payment action and client id
 *
 * @returns {string} created url
 */
function createBillingSDKUrl() {
    const clientID = getClientId();
    const currentCurrencyCode = session.currency.currencyCode;
    let sdkUrl = 'https://www.paypal.com/sdk/js?client-id=' + clientID;
    const isActiveBa = customer.authenticated && billingAgreementEnabled;
    const isActiveLPM = !isActiveBa && isCapture && !empty(enabledLPMs);

    sdkUrl += isActiveLPM ? '&commit=true' : '&commit=false';

    if (!isCapture && !isActiveBa) {
        sdkUrl += '&intent=authorize';
    }

    if (isActiveBa) {
        sdkUrl += '&vault=true';
    }

    if (isAllowedCurrency(allowedCurrencies, currentCurrencyCode)) {
        sdkUrl += '&currency=' + currentCurrencyCode;
    }

    sdkUrl += '&disable-funding=' + disabledPaymentOptions().join(',');

    return sdkUrl;
}

/**
 * Creates SDK url for paypal button on cart page based on payment action and client id
 *
 * @returns {string} created url
 */
function createCartSDKUrl() {
    const clientID = getClientId();
    const currentCurrencyCode = session.currency.currencyCode;
    let sdkUrl = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=false';
    const isActiveBa = customer.authenticated && billingAgreementEnabled;

    if (!isCapture && !isActiveBa) {
        sdkUrl += '&intent=authorize';
    }

    if (isActiveBa) {
        sdkUrl += '&vault=true';
    }

    if (isAllowedCurrency(allowedCurrencies, currentCurrencyCode)) {
        sdkUrl += '&currency=' + currentCurrencyCode;
    }

    sdkUrl += '&disable-funding=' + disabledPaymentOptions().join(',');

    return sdkUrl;
}

/**
 * Get logger instance
 *
 * @param {string} err Error message
 */
function createErrorLog(err) {
    var Logger = require('dw/system/Logger');
    paypalLogger = paypalLogger || Logger.getLogger('PayPal', 'PayPal_General');
    if (!empty(err)) {
        paypalLogger.error(err.stack ? (err.message + err.stack) : err);
    } else {
        paypalLogger.debug('Empty log entry');
    }
    return;
}

/**
 * Get the client-side URLs of a given page
 *
 * @returns {Object} An objects key key-value pairs holding the URLs
 */
function getUrls() {
    const { partnerAttributionId } = require('../../config/paypalPreferences');
    return {
        getPurchaseUnit: URLUtils.https('Paypal-GetPurchaseUnit').toString(),
        getCartPurchaseUnit: URLUtils.https('Paypal-GetPurchaseUnit', 'isCartFlow', 'true').toString(),
        returnFromCart: URLUtils.https('Paypal-ReturnFromCart').toString(),
        billingSdkUrl: createBillingSDKUrl(),
        cartSdkUrl: createCartSDKUrl(),
        placeOrderStage: URLUtils.url('Checkout-Begin', 'stage', 'placeOrder').toString(),
        updateOrderData: URLUtils.url('Paypal-UpdateOrderDetails').toString(),
        createBillingAgreementToken: URLUtils.url('Paypal-GetBillingAgreementToken').toString(),
        createBillingAgreement: URLUtils.url('Paypal-CreateBillingAgreement').toString(),
        getOrderDetails: URLUtils.url('Paypal-GetOrderDetails').toString(),
        paymentStage: URLUtils.https('Checkout-Begin', 'stage', 'payment').toString(),
        finishLpmOrder: URLUtils.url('Paypal-FinishLpmOrder').toString(),
        partnerAttributionId: partnerAttributionId
    };
}

/**
 * Creates the Error Message
 *
 * @param {string} errorName error message name
 * @returns {string} errorMsg - Resource error massage
 */
function createErrorMsg(errorName) {
    const defaultMessage = Resource.msg('paypal.error.general', 'paypalerrors', null);
    const errorMsg = Resource.msg('paypal.error.' + errorName, 'paypalerrors', defaultMessage);
    return errorMsg;
}

module.exports = {
    getClientId: getClientId,
    createErrorLog: createErrorLog,
    encodeString: encodeString,
    getUrls: getUrls,
    createErrorMsg: createErrorMsg,
    createBillingSDKUrl: createBillingSDKUrl,
    createCartSDKUrl: createCartSDKUrl
};
