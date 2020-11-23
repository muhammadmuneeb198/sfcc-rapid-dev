'use strict';

var server = require('server');
const Transaction = require('dw/system/Transaction');
const HookMgr = require('dw/system/HookMgr');
const Resource = require('dw/web/Resource');
const PaymentMgr = require('dw/order/PaymentMgr');

const {
    isPurchaseUnitChanged,
    getPurchaseUnit,
    isExpiredTransaction,
    cartPaymentForm,
    getBARestData
} = require('../scripts/paypal/helpers/paypalHelper');

const {
    updateOrderDetails,
    getBillingAgreementToken,
    createBillingAgreement,
    getOrderDetails,
    getBADetails
} = require('../scripts/paypal/paypalApi');

const {
    encodeString,
    createErrorMsg,
    createErrorLog
} = require('../scripts/paypal/paypalUtils');

const {
    createPaymentInstrument,
    getPaypalPaymentInstrument,
    removePaypalPaymentInstrument,
    removeNonPayPalPaymentInstrument
} = require('../scripts/paypal/helpers/paymentInstrumentHelper');

const {
    removeBAfromSession
} = require('../scripts/paypal/helpers/billingAgreementHelper');

const {
    updateOrderBillingAddress,
    updateOrderShippingAddress,
    updateBABillingAddress,
    updateBAShippingAddress
} = require('../scripts/paypal/helpers/addressHelper');

const {
    paypalPaymentMethodId
} = require('../config/paypalPreferences');

server.get('GetPurchaseUnit', server.middleware.https, function (req, res, next) {
    const { currentBasket } = require('dw/order/BasketMgr');
    const cartFlow = req.querystring.isCartFlow === 'true';
    const purchase_units = [getPurchaseUnit(currentBasket, cartFlow)];
    session.privacy.orderDataHash = encodeString(purchase_units[0]);
    res.json({
        purchase_units: purchase_units
    });
    next();
});

server.use('UpdateOrderDetails', server.middleware.https, function (_, res, next) {
    const { currentBasket } = require('dw/order/BasketMgr');
    const purchase_unit = getPurchaseUnit(currentBasket);
    const isUpdateRequired = isPurchaseUnitChanged(purchase_unit);
    const paymentInstrument = getPaypalPaymentInstrument(currentBasket);

    if (isExpiredTransaction(paymentInstrument)) {
        removePaypalPaymentInstrument(currentBasket);
        removeBAfromSession();
        res.setStatusCode(500);
        res.json({
            transactionExpired: true,
            errorMsg: createErrorMsg('expiredpayment')
        });

        return next();
    }

    if (paymentInstrument.custom.PP_API_ActiveBillingAgreement) {
        const Money = require('dw/value/Money');
        if (paymentInstrument.paymentTransaction.amount.value.toString() !== purchase_unit.amount.value) {
            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.setAmount(new Money(purchase_unit.amount.value, purchase_unit.amount.currency_code));
            });
        }
        res.json({});
        return next();
    } else if (isUpdateRequired) {
        if (purchase_unit.amount.value === '0') {
            res.setStatusCode(500);
            res.json({
                errorMsg: createErrorMsg('zeroamount')
            });

            return next();
        }
        let { err } = updateOrderDetails(paymentInstrument, purchase_unit);
        if (err) {
            res.setStatusCode(500);
            res.json({
                errorMsg: err
            });
            return next();
        }
        session.privacy.orderDataHash = encodeString(purchase_unit);
        res.json({});
        return next();
    }
});

server.post('ReturnFromCart', server.middleware.https, function (req, res, next) {
    const { currentBasket } = require('dw/order/BasketMgr');
    var processorHandle = null;
    var paypalData = null;
    try {
        paypalData = req.body && JSON.parse(req.body);
    } catch (error) {
        createErrorLog(error);
        res.setStatusCode(500);
        res.print(createErrorMsg());
        return next();
    }

    if (!empty(currentBasket.paymentInstruments)) {
        removeNonPayPalPaymentInstrument(currentBasket);
    }

    var processor = PaymentMgr.getPaymentMethod(paypalPaymentMethodId).getPaymentProcessor();
    if (!processor) {
        createErrorLog(Resource.msg('error.payment.processor.missing', 'checkout', null));
        res.setStatusCode(500);
        res.print(createErrorMsg());
        return next();
    }

    if (HookMgr.hasHook('app.payment.processor.' + processor.ID.toLowerCase())) {
        processorHandle = HookMgr.callHook('app.payment.processor.' + processor.ID.toLowerCase(), 'Handle', currentBasket, cartPaymentForm({
            paypalData: paypalData
        }));
    } else {
        createErrorLog(Resource.msg('paypal.error.processoremisssing', 'paypalerrors', null));
        res.setStatusCode(500);
        res.print(createErrorMsg());
        return next();
    }

    if (!processorHandle || !processorHandle.success) {
        res.setStatusCode(500);
        res.print(createErrorMsg());
        return next();
    }

    if (processorHandle.paymentInstrument.custom.paypalOrderID) {
        let { payer, purchase_units } = processorHandle.orderIdDetails;
        updateOrderShippingAddress(currentBasket, purchase_units, payer);
        if (!processorHandle.paymentInstrument.custom.currentPaypalEmail) {
            Transaction.wrap(function () {
                processorHandle.paymentInstrument.custom.currentPaypalEmail = payer.email_address;
            });
        }
    } else if (processorHandle.paymentInstrument.custom.PP_API_ActiveBillingAgreement) {
        var billingInfo;
        var shippingAddress;
        if (!processorHandle.baDetails) {
            var { billing_info, shipping_address, err } = getBADetails(processorHandle.paymentInstrument);
            if (err) {
                res.setStatusCode(500);
                res.print(err);
                return next();
            }
            billingInfo = billing_info;
            shippingAddress = shipping_address;
        } else {
            billingInfo = processorHandle.baDetails.billing_info;
            shippingAddress = processorHandle.baDetails.shipping_address;
        }
        updateBABillingAddress(currentBasket, billingInfo);
        updateBAShippingAddress(currentBasket, shippingAddress, billingInfo);
    }

    res.json();
    return next();
});

server.get('GetBillingAgreementToken', server.middleware.https, function (req, res, next) {
    let isCartFlow = req.querystring.isCartFlow === 'true';
    let { billingAgreementToken, err } = getBillingAgreementToken(getBARestData(isCartFlow));
    if (err) {
        res.setStatusCode(500);
        res.print(err);
        return next();
    }

    res.json({
        token: billingAgreementToken
    });
    next();
});

server.post('CreateBillingAgreement',
    server.middleware.https,
    function (req, res, next) {
        const { currentBasket } = require('dw/order/BasketMgr');
        let paypalData;
        try {
            paypalData = req.body && JSON.parse(req.body);
        } catch (error) {
            createErrorLog(error);
            res.setStatusCode(500);
            res.print(createErrorMsg());
            return next();
        }
        let response = createBillingAgreement(paypalData.billingToken);
        if (response.err) {
            res.setStatusCode(500);
            res.print(response.err);
            return next();
        }
        updateBABillingAddress(currentBasket, response.payer.payer_info);

        res.json(response);
        next();
    });

server.get('GetOrderDetails', server.middleware.https, function (req, res, next) {
    let orderId = req.querystring.orderId;
    let response = getOrderDetails({
        custom: {
            paypalOrderID: orderId
        }
    });
    if (response.err) {
        res.setStatusCode(500);
        res.print(response.err);
        return next();
    }

    res.json(response);
    next();
});

server.post('FinishLpmOrder', server.middleware.https, function (req, res, next) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var OrderMgr = require('dw/order/OrderMgr');
    var Order = require('dw/order/Order');
    var Status = require('dw/system/Status');
    var URLUtils = require('dw/web/URLUtils');

    const { details } = req.body && JSON.parse(req.body);
    const { currentBasket } = require('dw/order/BasketMgr');
    var paymentInstrument = createPaymentInstrument(currentBasket, 'PayPal');
    var paymentProcessor = PaymentMgr.getPaymentMethod('PayPal').getPaymentProcessor();

    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
        paymentInstrument.custom.paypalOrderID = details.id;
        paymentInstrument.custom.currentPaypalEmail = details.payer.email_address;
    });

    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        res.setStatusCode(500);
        res.print(createErrorMsg());
        return next();
    }

    // Update billing address.
    updateOrderBillingAddress(currentBasket, details.payer);

    // Places the order.
    try {
        Transaction.begin();
        var placeOrderStatus = OrderMgr.placeOrder(order);
        if (placeOrderStatus === Status.ERROR) throw new Error();
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        order.setExportStatus(Order.EXPORT_STATUS_READY);
        Transaction.commit();
    } catch (e) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
        createErrorLog(e);
        res.setStatusCode(500);
        res.print(e.message);
        return next();
    }

    // Clean up basket.
    removePaypalPaymentInstrument(currentBasket);

    res.json({
        redirectUrl: URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken).toString()
    });
    next();
});

module.exports = server.exports();
