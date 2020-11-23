'use strict';

const allowedProcessorsIds = 'PAYPAL';

/**
 * Returns paypal payment method ID
 * @returns {string} active paypal payment method id
 */
function getPaypalPaymentMethodId() {
    const activePaymentMethods = require('dw/order/PaymentMgr').getActivePaymentMethods();
    var paypalPaymentMethodID;

    Array.some(activePaymentMethods, function (paymentMethod) {
        if (paymentMethod.paymentProcessor.ID === allowedProcessorsIds) {
            paypalPaymentMethodID = paymentMethod.ID;
            return true;
        }
        return false;
    });
    return paypalPaymentMethodID;
}

/**
 *  Returns PayPal custom and hardcoded preferences
 *
 * @returns {Object} statis preferences
 */
function getPreferences() {
    const prefsCache = require('dw/system/CacheMgr').getCache('paypalPreferences');
    var prefs = prefsCache.get('preferences');
    if (prefs) {
        return prefs;
    }

    const {
        paypalCartButtonConfig,
        paypalBillingButtonConfig,
        staticImageLink
    } = require('./sdkConfig');
    const site = require('dw/system/Site').current;

    prefs = {
        isCapture: site.getCustomPreferenceValue('PP_API_PaymentAction'),
        paypalPaymentMethodId: getPaypalPaymentMethodId(),
        cartButtonEnabled: site.getCustomPreferenceValue('PP_API_Cart_Page_Button'),
        billingAgreementEnabled: site.getCustomPreferenceValue('PP_API_BA_Enabled'),
        billingAgreementDescription: site.getCustomPreferenceValue('PP_API_BA_Description'),
        enabledLPMs: site.getCustomPreferenceValue('PP_API_APM_methods'),
        paypalCartButtonConfig: paypalCartButtonConfig,
        paypalBillingButtonConfig: paypalBillingButtonConfig,
        paypalProcessorId: allowedProcessorsIds,
        staticImageLink: staticImageLink,
        partnerAttributionId: 'SFCC_EC_B2C_2020_1_1'
    };
    prefsCache.put('preferences', prefs);

    return prefs;
}

module.exports = getPreferences();
