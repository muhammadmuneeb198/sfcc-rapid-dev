import {
    showCartErrorHtml
} from '../api';

var loaderInstance = require('../loader');
var $loaderContainer = document.querySelector('.paypalLoader');
var loader = loaderInstance($loaderContainer);

const defaultStyle = {
    color: 'gold',
    shape: 'rect',
    layout: 'vertical',
    label: 'checkout',
    tagline: false
};

/**
 *  Gets cart button styles
 *
 * @returns {Object} with button styles or if error appears with default styles
 */
function getCartButtonStyle() {
    var cartButtonConfigs;
    try {
        if (document.querySelector('.js_paypal_button_on_cart_page').getAttribute('data-paypal-button-config')) {
            cartButtonConfigs = JSON.parse(document.querySelector('.js_paypal_button_on_cart_page').getAttribute('data-paypal-button-config'));
            return cartButtonConfigs.style;
        }
    } catch (error) {
        return {
            style: defaultStyle
        };
    }
}

/**
 *  Gets purchase units object, creates order and returns object with data
 *
 * @param {Object} _ - arg
 * @param {Object} actions - paypal actions
 * @returns {Object} with purchase units data and application context
 */
function createOrder(_, actions) {
    loader.show();
    return $
        .get(window.paypalUrls.getCartPurchaseUnit)
        .then(function ({ purchase_units }) {
            let parsedPurchaseUnit = JSON.parse(purchase_units[0].amount.value);
            if (parsedPurchaseUnit === 0) {
                showCartErrorHtml('Order total 0 is not allowed for PayPal');
            }
            const application_context = {
                shipping_preference: 'GET_FROM_FILE'
            };
            loader.hide();
            return actions.order.create({
                purchase_units,
                application_context
            });
        });
}

/**
 *  Makes post call and transfers order ID to returnFromCart endpoint, goes to checkout place order stage
 *
 * @param {Object} orderID - order id
 */
function onApprove({ orderID }) {
    $.ajax({
        type: 'POST',
        url: window.paypalUrls.returnFromCart,
        contentType: 'application/json',
        data: JSON.stringify({
            paypalOrderID: orderID
        }),
        success: () => {
            loader.hide();
            window.location.href = window.paypalUrls.placeOrderStage;
        },
        error: function () {
            if (!document.querySelector('.cartError')) {
                showCartErrorHtml('An internal server error has occurred. \r\nRetry the request later.');
            }
            loader.hide();
        }
    });
}

/**
 * Hides loader on paypal widget closing without errors
 *
 */
function onCancel() {
    loader.hide();
}

/**
 * Shows errors if paypal widget was closed with errors
 *
 */
function onError() {
    loader.hide();
    if (!document.querySelector('.cartError')) {
        showCartErrorHtml('An internal server error has occurred. \r\nRetry the request later.');
    }
}

/**
 *Inits paypal button on cart page
 */
function initPaypalButton() {
    loader.show();
    window.paypal.Buttons({
        createOrder,
        onApprove,
        onCancel,
        onError,
        style: getCartButtonStyle()
    }).render('.paypal-cart-button')
        .then(() => {
            loader.hide();
        });
}

export default initPaypalButton;
