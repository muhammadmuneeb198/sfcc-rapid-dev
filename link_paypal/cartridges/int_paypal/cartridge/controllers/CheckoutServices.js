'use strict';

var page = module.superModule;
var server = require('server');

var Transaction = require('dw/system/Transaction');
var HookMgr = require('dw/system/HookMgr');

var Locale = require('dw/util/Locale');
var BasketMgr = require('dw/order/BasketMgr');

var AccountModel = require('*/cartridge/models/account');
var OrderModel = require('*/cartridge/models/order');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

var {
    isExpiredTransaction,
    isErrorEmail,
    createErrorEmailResponse,
    getPurchaseUnit,
    isPurchaseUnitChanged,
    basketModelHack,
    updateCustomerEmail,
    updateCustomerPhone,
    updatePayPalEmail
} = require('../scripts/paypal/helpers/paypalHelper');

var {
    getPaypalPaymentInstrument,
    removePaypalPaymentInstrument,
    removeNonPayPalPaymentInstrument
} = require('../scripts/paypal/helpers/paymentInstrumentHelper');
const {
    updateOrderDetails,
    getOrderDetails,
    getBADetails
} = require('../scripts/paypal/paypalApi');

const {
    encodeString,
    createErrorMsg,
    createErrorLog,
    getUrls
} = require('../scripts/paypal/paypalUtils');

const {
    paypalPaymentMethodId
} = require('../config/paypalPreferences');

const {
    getBAEmailFromForm,
    isSameBillingAgreement,
    createBaFromForm,
    removeBAfromSession,
    saveBAtoSession
} = require('../scripts/paypal/helpers/billingAgreementHelper');

const {
    updateOrderBillingAddress,
    updateBABillingAddress
} = require('../scripts/paypal/helpers/addressHelper');

const BillingAgreementModel = require('../models/billingAgreement');


server.extend(page);

server.append('SubmitPayment', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    var basket = BasketMgr.getCurrentBasket();
    var currencyCode = basket.getCurrencyCode();
    var paypalPaymentInstrument = getPaypalPaymentInstrument(basket);
    var paymentInstruments = basket.getPaymentInstruments();
    var billingData = res.getViewData();
    var billingForm = server.forms.getForm('billing');
    var isUserHasActiveSessionAccount = paypalPaymentInstrument && paypalPaymentInstrument.custom.paypalOrderID;

    if (isExpiredTransaction(paypalPaymentInstrument)) {
        removePaypalPaymentInstrument(basket);
        removeBAfromSession();
        res.json({
            form: billingForm,
            fieldErrors: [],
            serverErrors: [createErrorMsg('expiredpayment')],
            error: true,
            redirectUrl: getUrls().paymentStage,
            cartError: true
        });
        this.emit('route:Complete', req, res);
        return;
    }

    if (billingForm.paymentMethod.htmlValue !== paypalPaymentMethodId) {
        // if change payment from paypal to different one we remove paypal as payment instrument
        if (paypalPaymentInstrument) {
            removePaypalPaymentInstrument(basket);
            removeBAfromSession();
        }

        next();
        return;
    }

    // if change payment method from different one to paypal we remove already existing payment instrument
    if (!empty(paymentInstruments) && !paypalPaymentInstrument && billingForm.paymentMethod.htmlValue === paypalPaymentMethodId) {
        removeNonPayPalPaymentInstrument(basket);
    }

    if (!paypalPaymentInstrument) {
        billingData.paymentMethod = {
            value: paypalPaymentMethodId
        };
        billingData.paymentInformation = {
            billingForm: billingForm
        };
        res.setViewData(billingData);

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var currentBasket = BasketMgr.getCurrentBasket();
            var viewData = res.getViewData();

            updatePayPalEmail({
                basketModel: viewData.order,
                paypalPI: getPaypalPaymentInstrument(currentBasket)
            });
            basketModelHack(viewData.order, currencyCode);

            res.json(viewData);
        });

        return next();
    }

    if (isErrorEmail(billingData)) {
        res.json(createErrorEmailResponse(billingData));
        this.emit('route:Complete', req, res);
        return;
    }

    updateCustomerEmail(basket, billingData);
    updateCustomerPhone(basket, billingData);

    if (paypalPaymentInstrument && paypalPaymentInstrument.custom.PP_API_ActiveBillingAgreement) {
        let activeBA;
        let isActiveBAchanged;
        let baFromPaymentInstrument;
        let billingAgreementModel = new BillingAgreementModel();
        let currentBABillingEmail = getBAEmailFromForm(billingForm.paypal);
        let isAccountSavedToProfile = billingAgreementModel.isAccountAlreadyExist(currentBABillingEmail);

        if (isAccountSavedToProfile) {
            activeBA = billingAgreementModel.getBillingAgreementByEmail(currentBABillingEmail);
            activeBA.default = billingForm.paypal.makeDefaultPaypalAccount.checked;
        } else {
            activeBA = createBaFromForm(billingForm);
            if (empty(activeBA.baID)) {
                activeBA.baID = session.privacy.baID;
            }
            saveBAtoSession(activeBA);
        }

        try {
            baFromPaymentInstrument = JSON.parse(paypalPaymentInstrument.custom.PP_API_ActiveBillingAgreement);
            isActiveBAchanged = !isSameBillingAgreement(baFromPaymentInstrument, activeBA);
        } catch (error) {
            createErrorLog(error);
            res.json({
                form: billingForm,
                fieldErrors: [],
                serverErrors: [createErrorMsg()],
                error: true
            });
            this.emit('route:Complete', req, res);
            return;
        }

        if (isActiveBAchanged) {
            Transaction.wrap(function () {
                paypalPaymentInstrument.custom.PP_API_ActiveBillingAgreement = JSON.stringify(activeBA);
            });
            if (baFromPaymentInstrument.email !== activeBA.email) {
                // if condition to determine if BA was just created or it is from dropdown if it is possible
                let { billing_info, err } = getBADetails(paypalPaymentInstrument);
                if (err) {
                    res.json({
                        form: billingForm,
                        fieldErrors: [],
                        serverErrors: [err],
                        error: true
                    });
                    this.emit('route:Complete', req, res);
                    return;
                }
                updateBABillingAddress(basket, billing_info);
                session.privacy.paypalPayerEmail = billing_info.email;
            } else {
                session.privacy.paypalPayerEmail = paypalPaymentInstrument.custom.currentPaypalEmail;
            }
        }
    }
    var noOrderIdChange = isUserHasActiveSessionAccount && paypalPaymentInstrument.custom.paypalOrderID === billingForm.paypal.paypalOrderID.htmlValue;
    // if user goes through checkout with the same session account we update order details if needed
    if (noOrderIdChange) {
        const purchase_unit = getPurchaseUnit(basket);
        if (purchase_unit.amount.value === '0') {
            res.json({
                form: billingForm,
                fieldErrors: [],
                serverErrors: [createErrorMsg('zeroamount')],
                error: true
            });
            this.emit('route:Complete', req, res);
            return;
        }
        const isUpdateRequired = isPurchaseUnitChanged(purchase_unit);
        if (isUpdateRequired) {
            let { err } = updateOrderDetails(paypalPaymentInstrument, purchase_unit);
            if (err) {
                res.json({
                    form: billingForm,
                    fieldErrors: [],
                    serverErrors: [err],
                    error: true
                });
                this.emit('route:Complete', req, res);
                return;
            }
            session.privacy.orderDataHash = encodeString(purchase_unit);
        }
    }
    var isOrderIdChanged = isUserHasActiveSessionAccount && paypalPaymentInstrument.custom.paypalOrderID !== billingForm.paypal.paypalOrderID.htmlValue;
    // if user changes one session account to another we update billing address and email
    if (isOrderIdChanged) {
        Transaction.wrap(function () {
            paypalPaymentInstrument.custom.paypalOrderID = billingForm.paypal.paypalOrderID.htmlValue;
        });
        let { payer, err } = getOrderDetails(paypalPaymentInstrument);
        if (err) {
            res.json({
                form: billingForm,
                fieldErrors: [],
                serverErrors: [err],
                error: true
            });
            this.emit('route:Complete', req, res);
            return;
        }
        updateOrderBillingAddress(basket, payer);
        session.privacy.paypalPayerEmail = payer.email_address;
    }

    Transaction.wrap(function () {
        HookMgr.callHook('dw.order.calculate', 'calculate', basket);
    });

    var usingMultiShipping = false; // Current integration support only single shpping
    req.session.privacyCache.set('usingMultiShipping', usingMultiShipping);
    var currentLocale = Locale.getLocale(req.locale.id);

    var basketModel = new OrderModel(basket, { usingMultiShipping: usingMultiShipping, countryCode: currentLocale.country, containerView: 'basket' });

    updatePayPalEmail({
        basketModel: basketModel,
        paypalPI: paypalPaymentInstrument
    });
    basketModelHack(basketModel, currencyCode);

    res.json({
        customer: new AccountModel(req.currentCustomer),
        order: basketModel,
        form: billingForm,
        fieldErrors: [],
        error: false
    });
    this.emit('route:Complete', req, res);
});

module.exports = server.exports();
