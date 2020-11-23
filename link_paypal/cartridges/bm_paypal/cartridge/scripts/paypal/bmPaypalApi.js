const paypalRestService = require('../service/bmPaypalRestService');
const {
    createErrorLog
} = require('./bmPaypalUtils');
var util = require('dw/util');

/**
 * Function to get information about an order
 *
 * @param {string} id - paypal Order ID or paypal token for NVP orders
 * @returns {Object} Call handling result
 */
function getOrderDetails(id) {
    try {
        if (!id) {
            createErrorLog('No paypalOrderID or paypal token was found in payment instrument');
            throw new Error();
        }
        var resp = paypalRestService.call({
            path: 'v2/checkout/orders/' + id,
            method: 'GET',
            body: {}
        });

        if (resp) {
            return resp;
        }
    } catch (err) {
        return {
            err: true,
            responseData: {
                l_longmessage0: err.message
            }
        };
    }
}

/**
 * Voids, or cancels, an authorized payment, by ID.
 * You cannot void an authorized payment that has been fully captured.
 * NOT Captured Payment !!!
 *
 * TRANSACTIONID(authorization_id) - purchase_units[0].payments.authorizations[0].id
 *
 * @param {Object} data Object with Request Fields
 * @returns {Object} Call handling result
 */
function DoVoid(data) {
    try {
        if (!data.AUTHORIZATIONID) {
            createErrorLog('No authorization_id was found during voiding');
            throw new Error();
        }

        // A successful request returns the HTTP 204 No Content status code with no JSON response body
        paypalRestService.call({
            path: 'v2/payments/authorizations/' + data.AUTHORIZATIONID + '/void',
            method: 'POST',
            body: {}
        });

        return {
            responseData: { ack: 'Success' },
            status: 'COMPLETED'
        };
    } catch (err) {
        return {
            err: true,
            responseData: {
                l_longmessage0: err.message
            }
        };
    }
}

/**
 * Function to reauthorizes an existing authorization transaction
 *
 * TRANSACTIONID(authorization_id) - purchase_units[0].payments.authorizations[0].id
 *
 * @param {Object} data Object with Request Fields
 * @returns {Object} Call handling result
 */
function DoReauthorize(data) {
    try {
        if (!data.AUTHORIZATIONID) {
            createErrorLog('No authorization_id was found during reauthorization');
            throw new Error();
        }

        // A successful request returns the HTTP 201 and body that contains a new authorization ID you can use to capture the payment
        var resp = paypalRestService.call({
            path: 'v2/payments/authorizations/' + data.AUTHORIZATIONID + '/reauthorize',
            method: 'POST',
            body: {}
        });

        if (resp.status !== 'CREATED') {
            createErrorLog('Attempt to reAuthorize was not successful');
            throw new Error();
        }

        resp.responseData = { ack: 'Success' };
        return resp;
    } catch (err) {
        return {
            err: true,
            responseData: {
                l_longmessage0: err.message
            }
        };
    }
}

/**
 * Refunds a captured payment, by ID.
 * For a full refund, include an empty payload in the JSON request body.
 * For a partial refund, include an amount object in the JSON request body
 *
  * TRANSACTIONID(capture_id) - purchase_units[0].payments.captures[0].id
 * { "amount": { "value": "999.99", "currency_code": "USD"} } || {}
 *
 * @param {Object} data Object with Request Fields
 * @returns {Object} Call handling result
 */
function RefundTransaction(data) {
    try {
        if (!data.TRANSACTIONID) {
            createErrorLog('No capture_id was found');
            throw new Error();
        }

        var body = {};
        if (data.INVNUM) {
            body.invoice_id = data.INVNUM;
        }
        if (data.NOTE) {
            body.note_to_payer = data.NOTE;
        }
        if (data.AMT) {
            body.amount = {
                value: data.AMT,
                currency_code: data.CURRENCYCODE
            };
        }
        var resp = paypalRestService.call({
            path: 'v2/payments/captures/' + data.TRANSACTIONID + '/refund',
            body: body
        });

        if (resp.status !== 'COMPLETED') {
            createErrorLog('Attempt to reFund was not successful');
            throw new Error();
        }

        resp.responseData = { ack: 'Success' };
        return resp;
    } catch (err) {
        return {
            err: true,
            responseData: {
                l_longmessage0: err.message
            }
        };
    }
}

/**
 * Function to capture an authorized payment
 *
 * @param {Object} data Object with Request Fields
 * @returns {Object} Call handling result
 */
function DoCapture(data) {
    try {
        if (!data.AUTHORIZATIONID) {
            createErrorLog('No authorization_id was found during capturing');
            throw new Error();
        }

        var body = {
            final_capture: false,
            amount: {
                value: data.AMT,
                currency_code: data.CURRENCYCODE
            }
        };
        if (data.INVNUM) {
            body.invoice_id = data.INVNUM;
        }

        if (data.NOTE) {
            body.note_to_payer = data.NOTE;
        }

        var resp = paypalRestService.call({
            path: 'v2/payments/authorizations/' + data.AUTHORIZATIONID + '/capture',
            body: body
        });

        resp.responseData = { ack: 'Success' };
        return resp;
    } catch (err) {
        return {
            err: true,
            responseData: {
                l_longmessage0: err.message
            }
        };
    }
}

/**
 * Function to create order if BA exists
 * If BA exists it is used as payment source in body
 *
 * @param {Object} data - data
 * @param {string} paymentAction action to perform
 * @returns {Object} Call handling result
 */
function createOrder(data, paymentAction) {
    try {
        if (!data) {
            createErrorLog('No data was found');
            throw new Error();
        }

        var purchaseUnit = require('./bmPaymentInstrumentHelper').getPurchaseUnit(data);

        return paypalRestService.call({
            path: 'v2/checkout/orders',
            body: {
                intent: paymentAction.toUpperCase(),
                purchase_units: [purchaseUnit]
            },
            partnerAttributionId: 'SFCC_EC_B2C_BM_2020_1_1'
        });
    } catch (err) {
        return {
            err: true,
            responseData: {
                l_longmessage0: err.message
            }
        };
    }
}

/**
 * Function to processes a payment from a buyer's account, which is identified by a previous transaction
 *
 * @param {Object} data Object with Request Fields
 * @returns {Object} Call handling result
 */
function DoReferenceTransaction(data) {
    try {
        if (!data.REFERENCEID) {
            createErrorLog('No paypal BA id found');
            throw new Error();
        }
        const paymentAction = data.PAYMENTACTION === 'Authorization' ? 'authorize' : 'capture';
        const { id } = createOrder(data, paymentAction);

        var res = paypalRestService.call({
            path: 'v2/checkout/orders/' + id + '/' + paymentAction,
            body: {
                payment_source: {
                    token: {
                        id: data.REFERENCEID,
                        type: 'BILLING_AGREEMENT'
                    }
                }
            }
        });

        return {
            responseData: {
                ack: 'Success',
                paymentstatus: res.status,
                purchaseUnits: res.purchase_units,
                payer: res.payer,
                transactionid: res.id
            }
        };
    } catch (err) {
        return {
            err: true,
            responseData: {
                l_longmessage0: err.message
            }
        };
    }
}

/**
 * Call PayPal API method
 *
 * @param {string} methodName API method name
 * @param {Object} methodData API method data
 * @returns {Object} Call handling result
 */
function callMethod(methodName, methodData) {
    var data = new util.HashMap();
    var HttpParameterMap = require('dw/web/HttpParameterMap');

    var keys;
    if (methodData instanceof HttpParameterMap) {
        keys = methodData.getParameterNames().toArray();
    } else if (methodData instanceof util.HashMap) {
        keys = methodData.keySet().toArray();
    } else {
        keys = Object.keys(methodData);
    }
    keys.forEach(function (property) {
        if (property !== 'methodName' && !empty(methodData[property])) {
            data.put(property.toUpperCase(), methodData[property].toString());
        }
    });

    try {
        var respData = this[methodName](data);
        return respData;
    } catch (err) {
        return { err: err.message };
    }
}

module.exports = {
    getOrderDetails: getOrderDetails,
    DoVoid: DoVoid,
    DoReauthorize: DoReauthorize,
    RefundTransaction: RefundTransaction,
    DoCapture: DoCapture,
    DoReferenceTransaction: DoReferenceTransaction,
    createOrder: createOrder,
    callMethod: callMethod
};
