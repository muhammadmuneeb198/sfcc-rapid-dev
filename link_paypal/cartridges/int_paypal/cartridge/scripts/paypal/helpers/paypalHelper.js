'use strict';

const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const Order = require('dw/order/Order');
const Money = require('dw/value/Money');
const StringUtils = require('dw/util/StringUtils');

const { encodeString } = require('../paypalUtils');
const {
    paypalPaymentMethodId,
    billingAgreementDescription
} = require('../../../config/paypalPreferences');
const { calculateNonGiftCertificateAmount } = require('./paymentInstrumentHelper');
const {
    createShippingAddress,
    getBAShippingAddress
} = require('./addressHelper');

/**
 * Create purchase unit description based on items in the basket
 * @param  {dw.order.ProductLineItem} productLineItems Items in the basket
 * @returns {string} item description
 */
function getItemsDescription(productLineItems) {
    return Array.map(productLineItems, function (productLineItem) {
        return productLineItem.productName;
    }).join(',').substring(0, 127);
}

/**
 * @param  {dw.value.Money} acc current basket order + product discount
 * @param  {dw.order.OrderPaymentInstrument} giftCertificate GC from the basket
 * @returns {dw.value.Money} Gift certificate cotal
 */
function getAppliedGiftCertificateTotal(acc, giftCertificate) {
    return acc.add(giftCertificate.paymentTransaction.amount);
}

/**
 * Creates puchase unit data
 * @param {dw.order.Basket} currentBasket - user's basket
 * @param {boolean} isCartFlow - whether from cart or no
 * @returns {Object} with purchase unit data
 */
function getPurchaseUnit(currentBasket, isCartFlow) {
    const {
        currencyCode,
        defaultShipment,
        productLineItems,
        totalTax,
        shippingTotalPrice,
        adjustedShippingTotalPrice,
        merchandizeTotalPrice,
        adjustedMerchandizeTotalPrice,
        giftCertificateTotalPrice
    } = currentBasket;
    let orderNo;
    let handling;
    let insurance;

    Transaction.wrap(function () {
        orderNo = currentBasket instanceof Order ?
            currentBasket.orderNo :
            OrderMgr.createOrderNo();
    });
    const nonShippingDiscount = Array.reduce(
        currentBasket.giftCertificatePaymentInstruments,
        getAppliedGiftCertificateTotal,
        merchandizeTotalPrice.subtract(adjustedMerchandizeTotalPrice)
    );

    const purchaseUnit = {
        description: getItemsDescription(productLineItems),
        amount: {
            currency_code: currencyCode,
            value: calculateNonGiftCertificateAmount(currentBasket).value.toString(),
            breakdown: {
                item_total: {
                    currency_code: currencyCode,
                    value: merchandizeTotalPrice.add(giftCertificateTotalPrice).value.toString()
                },
                shipping: {
                    currency_code: currencyCode,
                    value: shippingTotalPrice.value.toString()
                },
                tax_total: {
                    currency_code: currencyCode,
                    value: totalTax.value.toString()
                },
                handling: {
                    currency_code: currencyCode,
                    value: !empty(handling) ? handling : '0'
                },
                insurance: {
                    currency_code: currencyCode,
                    value: !empty(insurance) ? insurance : '0'
                },
                shipping_discount: {
                    currency_code: currencyCode,
                    value: shippingTotalPrice
                        .subtract(adjustedShippingTotalPrice)
                        .value.toString()
                },
                discount: {
                    currency_code: currencyCode,
                    value: nonShippingDiscount.value.toString()
                }
            }
        },
        invoice_id: orderNo
    };
    if (!isCartFlow && defaultShipment && defaultShipment.getShippingAddress()) {
        purchaseUnit.shipping = createShippingAddress(defaultShipment.getShippingAddress());
    }
    return purchaseUnit;
}

/**
 * Returns transaction end time, result
 * (min) transaction lifetime (by default 72h or 4320min)
 * @param {dw.order.PaymentInstrument} paymentInstrument - PayPal payment instrument from basket
 * @returns {boolean} expired status
 */
function isExpiredTransaction(paymentInstrument) {
    if (!paymentInstrument) return false;

    var min = 4320;
    return Date.now() >= new Date(Date.parse(paymentInstrument.creationDate) + min * 60000).getTime();
}

/**
 * Returns true if email is not empty and have error from core
 * @param {Object} billingData - billingData from checkout
 * @returns {boolean}  true or false
 */
function isErrorEmail(billingData) {
    if (empty(billingData)) return false;

    if (billingData.form &&
        billingData.form.contactInfoFields.email &&
        !empty(billingData.form.contactInfoFields.email.htmlValue) &&
        !empty(billingData.fieldErrors) &&
        billingData.fieldErrors[0].dwfrm_billing_contactInfoFields_email
    ) {
        return true;
    }
    return false;
}

/**
 * Returns error response object for json
 * @param {Object} billingData - billingData from checkout
 * @returns {Object}  response
 */
function createErrorEmailResponse(billingData) {
    if (empty(billingData)) return false;

    return {
        form: billingData.form,
        fieldErrors: [{ dwfrm_billing_contactInfoFields_email: billingData.fieldErrors[0].dwfrm_billing_contactInfoFields_email }],
        error: true
    };
}

/**
 * Returns whether purchase unit has changed
 * @param {Object} purchaseUnit - purchase unit
 * @returns {boolean}  true or false
 */
function isPurchaseUnitChanged(purchaseUnit) {
    if (!session.privacy.orderDataHash) return true;
    return session.privacy.orderDataHash !== encodeString(purchaseUnit);
}

/**
* The hack renders right mock data for updatePaymentInformation(order)
* @param {Object} basketModel - order data
* @param {string} currencyCode - currencyCode
*/
function basketModelHack(basketModel, currencyCode) {
    const { resources, billing } = basketModel;
    resources.cardType = '';
    resources.cardEnding = '';
    let paypalAmount = billing.payment.selectedPaymentInstruments[0].amount;
    billing.payment.selectedPaymentInstruments.forEach(function (pi) {
        if (pi.paymentMethod === paypalPaymentMethodId) {
            pi.type = '';
            pi.maskedCreditCardNumber = basketModel.paypalPayerEmail || '';
            pi.expirationMonth = 'PayPal ';
            pi.expirationYear = ' ' + StringUtils.formatMoney(new Money(paypalAmount, currencyCode));
        }
    });
}

/**
 * Creates payment form for cart checkout
 * @param  {Object} data - paypal data from req
 * @returns {Object} object with payment form
 */
function cartPaymentForm(data) {
    return {
        billingForm: {
            paymentMethod: {
                value: paypalPaymentMethodId
            },
            paypal: {
                paypalOrderID: {
                    value: data.paypalData && data.paypalData.paypalOrderID
                },
                paypalActiveAccount: {
                    htmlValue: data.paypalData && data.paypalData.payerEmail
                },
                billingAgreementID: {
                    htmlValue: data.paypalData && data.paypalData.billingAgreementId
                },
                makeDefaultPaypalAccount: {
                    checked: true
                },
                savePaypalAccount: {
                    checked: true
                }
            }
        }
    };
}

/**
 * Returns needed REST API data for Create a billing agreement token requst
 *
 * @param {boolean} isCartFlow - is billing agreement flow from cart
 * @returns {Object} with token creation request data
 */
function getBARestData(isCartFlow) {
    let baTokenData = {
        path: 'v1/billing-agreements/agreement-tokens',
        method: 'POST',
        body: {
            description: billingAgreementDescription || '',
            payer:
            {
                payment_method: 'PAYPAL'
            },
            plan:
            {
                type: 'MERCHANT_INITIATED_BILLING_SINGLE_AGREEMENT',
                merchant_preferences:
                {
                    return_url: '1',
                    cancel_url: '2',
                    accepted_pymt_type: 'INSTANT',
                    skip_shipping_address: false,
                    immutable_shipping_address: !isCartFlow
                }
            }
        }
    };

    if (!isCartFlow) {
        const { currentBasket } = require('dw/order/BasketMgr');
        const shippingAddress = currentBasket.getDefaultShipment().getShippingAddress();
        baTokenData.body.shipping_address = getBAShippingAddress(shippingAddress);
    }

    return baTokenData;
}

/**
 * Sets customer's email to basket if user filled up or changed email on storefront
 *
 * @param {Object} basket - current user's basket
 * @param {Object} billingData - billing data from billing form
 */
function updateCustomerEmail(basket, billingData) {
    if (billingData.email && (!basket.customerEmail && billingData.email.value ||
        basket.customerEmail !== billingData.email.value)) {
        Transaction.wrap(function () {
            basket.setCustomerEmail(billingData.email.value);
        });
    } else if (billingData.form &&
        billingData.form.contactInfoFields.email &&
        !empty(billingData.form.contactInfoFields.email.htmlValue) &&
        (!basket.customerEmail && billingData.form.contactInfoFields.email.htmlValue ||
            basket.customerEmail !== billingData.form.contactInfoFields.email.htmlValue)) {
        Transaction.wrap(function () {
            basket.setCustomerEmail(billingData.form.contactInfoFields.email.htmlValue);
        });
    }
}

/**
 * Sets customer's phone to basket if user filled up or changed email on storefront
 *
 * @param {Object} basket - current user's basket
 * @param {Object} billingData - billing data from billing form
 */
function updateCustomerPhone(basket, billingData) {
    var billing = basket.getBillingAddress();
    if (billingData.phone && !empty(billingData.phone.value) &&
        basket.billingAddress.phone !== billingData.phone.value) {
        Transaction.wrap(function () {
            billing.setPhone(billingData.phone.value);
        });
    } else if (billingData.form && billingData.form.contactInfoFields.phone &&
        (!empty(billingData.form.contactInfoFields.phone.htmlValue) &&
            basket.billingAddress.phone !== billingData.form.contactInfoFields.phone.htmlValue)) {
        Transaction.wrap(function () {
            billing.setPhone(billingData.form.contactInfoFields.phone.htmlValue);
        });
    }
}

/**
 * Updates PayPal email
 *
 * @param {Object} params data object with basketModel and paypalPaymentInstrument
 */
function updatePayPalEmail(params) {
    if (session.privacy.paypalPayerEmail) {
        params.basketModel.paypalPayerEmail = session.privacy.paypalPayerEmail;
        if (params.paypalPI && params.paypalPI.custom.currentPaypalEmail !== session.privacy.paypalPayerEmail) {
            Transaction.wrap(function () {
                params.paypalPI.custom.currentPaypalEmail = session.privacy.paypalPayerEmail;
            });
        }
    } else {
        params.basketModel.paypalPayerEmail = params.paypalPI.custom.currentPaypalEmail || '';
    }
    session.privacy.paypalPayerEmail = null;
}

module.exports = {
    isExpiredTransaction: isExpiredTransaction,
    isErrorEmail: isErrorEmail,
    createErrorEmailResponse: createErrorEmailResponse,
    isPurchaseUnitChanged: isPurchaseUnitChanged,
    getPurchaseUnit: getPurchaseUnit,
    basketModelHack: basketModelHack,
    cartPaymentForm: cartPaymentForm,
    getBARestData: getBARestData,
    updateCustomerEmail: updateCustomerEmail,
    updateCustomerPhone: updateCustomerPhone,
    updatePayPalEmail: updatePayPalEmail
};
