'use strict';

const Transaction = require('dw/system/Transaction');
const PaymentMgr = require('dw/order/PaymentMgr');
const Order = require('dw/order/Order');

const {
    createPaymentInstrument
} = require('./helpers/paymentInstrumentHelper');
const {
    removeBAfromSession,
    getBAEmailFromForm,
    saveBAtoSession,
    createBaFromForm
} = require('./helpers/billingAgreementHelper');
const {
    getPurchaseUnit,
    isPurchaseUnitChanged
} = require('./helpers/paypalHelper');
const {
    createErrorLog,
    encodeString
} = require('../paypal/paypalUtils');
const {
    billingAgreementEnabled
} = require('../../config/paypalPreferences');
const {
    updateOrderBillingAddress,
    updateBABillingAddress
} = require('../../scripts/paypal/helpers/addressHelper');
const {
    getOrderDetails,
    getBADetails,
    updateOrderDetails
} = require('../../scripts/paypal/paypalApi');

const BillingAgreementModel = require('../../models/billingAgreement');

/**
 * Processor Handle
 *
 * @param {dw.order.LineItemCtnr} basket - Current basket
 * @param {Object} paymentInformation - paymentForm from hook
 * @returns {Object} Processor handling result
 */
function handle(basket, paymentInformation) {
    var paymentInstrument = createPaymentInstrument(basket, paymentInformation.billingForm.paymentMethod.value);
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInformation.billingForm.paymentMethod.value).getPaymentProcessor();
    var activeBillingAgreement;
    var orderIdDetails;
    var baDetails;

    if (customer.authenticated && billingAgreementEnabled) {
        let billingAgreementModel = new BillingAgreementModel();
        var currentBABillingEmail = getBAEmailFromForm(paymentInformation.billingForm.paypal);
        if (paymentInformation.billingForm.paypal.billingAgreementID && !empty(paymentInformation.billingForm.paypal.billingAgreementID.htmlValue)) {
            activeBillingAgreement = createBaFromForm(paymentInformation.billingForm);
        } else {
            activeBillingAgreement = billingAgreementModel.getBillingAgreementByEmail(currentBABillingEmail);
            activeBillingAgreement.default = paymentInformation.billingForm.paypal.makeDefaultPaypalAccount.checked;
        }
        let isAccountSavedToProfile = billingAgreementModel.isAccountAlreadyExist(activeBillingAgreement.email);
        if (!isAccountSavedToProfile) {
            saveBAtoSession(activeBillingAgreement);
        }
        Transaction.wrap(function () {
            paymentInstrument.custom.currentPaypalEmail = activeBillingAgreement.email;
        });
    }

    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
        if (activeBillingAgreement) {
            paymentInstrument.custom.PP_API_ActiveBillingAgreement = JSON.stringify(activeBillingAgreement);
            session.privacy.paypalPayerEmail = activeBillingAgreement && activeBillingAgreement.email;
            let billingAgreementModel = new BillingAgreementModel();
            let isAccountSavedToProfile = billingAgreementModel.isAccountAlreadyExist(session.privacy.paypalPayerEmail);
            // only if BA is already saved and taken from profile we update address and phone
            if (isAccountSavedToProfile) {
                let { shipping_address, billing_info, err } = getBADetails(paymentInstrument);
                if (err) {
                    createErrorLog(err);
                    return { error: true };
                }
                updateBABillingAddress(basket, billing_info);
                baDetails = {
                    shipping_address: shipping_address,
                    billing_info: billing_info
                };
            }
        } else {
            paymentInstrument.custom.paypalOrderID = paymentInformation.billingForm.paypal.paypalOrderID.value;
            let { payer, purchase_units, err } = getOrderDetails(paymentInstrument);
            if (err) return { error: true };

            updateOrderBillingAddress(basket, payer);
            session.privacy.paypalPayerEmail = payer.email_address;
            orderIdDetails = {
                payer: payer,
                purchase_units: purchase_units
            };
        }
    });

    return {
        success: true,
        paymentInstrument: paymentInstrument,
        orderIdDetails: orderIdDetails,
        baDetails: baDetails
    };
}

/**
 * Get transaction id from transaction response
 * @param  {Object} transactionResponse Response from call
 * @returns {string} Transaction id from response
 */
function getTransactionId(transactionResponse) {
    const payments = transactionResponse.purchase_units[0].payments;
    return payments.captures ?
        payments.captures[0].id :
        payments.authorizations[0].id;
}

/**
 * Get transaction status from transaction response
 * @param  {Object} transactionResponse Response from call
 * @returns {string} Transaction status from response
 */
function getTransactionStatus(transactionResponse) {
    const payments = transactionResponse.purchase_units[0].payments;
    var transactionStatus = payments.captures ? payments.captures[0].status : payments.authorizations[0].status;
    if (payments.authorizations && payments.authorizations[0].status === 'CAPTURED' && !payments.refunds) {
        transactionStatus = payments.authorizations[0].status;
    }

    return transactionStatus;
}

/**
 * Create a request body object for createOrder call with BA
 * @param  {dw.order.OrderPaymentInstrument} paymentInstrument current active paypal payment instrument
 * @returns {Object} body for request
 */
function createBAReqBody(paymentInstrument) {
    let activeBillingAgreement = JSON.parse(paymentInstrument.custom.PP_API_ActiveBillingAgreement);
    var billingAgreementId = activeBillingAgreement.baID;
    return {
        payment_source: {
            token: {
                id: billingAgreementId,
                type: 'BILLING_AGREEMENT'
            }
        }
    };
}

/**
 * Save result of rest call and update order data
 *
 * @param {dw.order.LineItemCtnr} order - Order object
 * @param {dw.order.OrderPaymentInstrument} paymentInstrument - current payment instrument
 * @returns {Object} Processor authorizing result
 */
function authorize(order, paymentInstrument) {
    const { createTransaction, createOrder } = require('./paypalApi');
    const purchaseUnit = getPurchaseUnit(order);
    const isUpdateRequired = isPurchaseUnitChanged(purchaseUnit);
    delete session.privacy.paypalUsedOrderNo;
    let bodyObj;
    let activeBillingAgreement;

    if (empty(paymentInstrument) || empty(order) || order.status === Order.ORDER_STATUS_FAILED) {
        return { error: true };
    }

    if (paymentInstrument.paymentTransaction.amount.value === 0) {
        return { error: true };
    }

    if (paymentInstrument.custom.paypalOrderID && isUpdateRequired) {
        let { err } = updateOrderDetails(paymentInstrument, purchaseUnit);
        if (err) {
            return {
                authorized: false,
                error: true,
                message: err
            };
        }
        session.privacy.orderDataHash = encodeString(purchaseUnit);
    }

    if (paymentInstrument.custom.PP_API_ActiveBillingAgreement) {
        let { resp, err } = createOrder(purchaseUnit);
        if (err) {
            return {
                authorized: false,
                error: true,
                message: err
            };
        }

        Transaction.wrap(function () {
            paymentInstrument.custom.paypalOrderID = resp.id;
        });

        try {
            bodyObj = createBAReqBody(paymentInstrument);
        } catch (err) {
            createErrorLog(err);
            return {
                error: true,
                authorized: false
            };
        }
    }

    let { response, err } = createTransaction(paymentInstrument, bodyObj);
    if (err) {
        return { error: true };
    }

    Transaction.wrap(function () {
        let transactionId = getTransactionId(response);
        paymentInstrument.getPaymentTransaction().setTransactionID(transactionId);
        paymentInstrument.custom.paypalPaymentStatus = getTransactionStatus(response);
        order.custom.paypalPaymentMethod = 'express';
        order.custom.PP_API_TransactionID = transactionId;
    });

    session.privacy.orderDataHash = null;

    if (activeBillingAgreement) {
        let billingAgreementModel = new BillingAgreementModel();
        let isAccountAlreadyExist = billingAgreementModel.isAccountAlreadyExist(activeBillingAgreement.email);
        if (isAccountAlreadyExist) {
            billingAgreementModel.updateBillingAgreement(activeBillingAgreement);
        } else {
            billingAgreementModel.saveBillingAgreement(activeBillingAgreement);
        }
        removeBAfromSession();
    }

    return { authorized: true };
}

exports.handle = handle;
exports.authorize = authorize;
