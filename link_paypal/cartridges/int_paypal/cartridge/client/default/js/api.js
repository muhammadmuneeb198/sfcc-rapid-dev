var loaderInstance = require('./loader');
var $loaderContainer = document.querySelector('.paypalLoader');
var loader = loaderInstance($loaderContainer);
/**
 *  Appends error message on cart page
 *
 * @param {string} message error message
 */
function showCartErrorHtml(message) {
    $('.checkout-btn').addClass('disabled');
    $('.cart-error').append(
        `<div class="alert alert-danger alert-dismissible valid-cart-error fade show cartError" role="alert">
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            ${message}
        </div>`
    );
    window.scrollTo(0, 0);
}

/**
 *  Appends error message on billing checkout page
 *
 * @param {string} message error message
 */
function showCheckoutErrorHtml(message) {
    document.querySelector('.error-message-text').textContent = '';
    document.querySelector('.error-message').style.display = 'block';
    document.querySelector('.error-message-text').append(message);
    window.scrollTo(0, 0);
}

/**
 * Updates information about an order
 *
 * @returns {Object} Call handling result
 */
function updateOrderData() {
    loader.show();
    return $.ajax({
        url: window.paypalUrls.updateOrderData,
        type: 'PATCH',
        success: () => {
            loader.hide();
            window.location.href = window.paypalUrls.placeOrderStage;
        },
        error: (err) => {
            loader.hide();
            var error = JSON.parse(err.responseText);
            showCartErrorHtml(error.errorMsg);
            if (error.transactionExpired) {
                location.reload();
            }
        }
    });
}

/**
 * Gets purchase units
 *
 * @returns {Object} with purchase units data
 */
function getPurchaseUnits() {
    return $.get(window.paypalUrls.getPurchaseUnit)
        .then(({ purchase_units }) => purchase_units);
}

/**
 * Gets Billing Agreement Token
 *
 * @param {boolean} isCartFlow - billing agreement flow from cart
 * @returns {string} billingToken - returns a JSON response that includes token, an approval URL
 */
function getBillingAgreementToken(isCartFlow = false) {
    return $.get(window.paypalUrls.createBillingAgreementToken + `?isCartFlow=${isCartFlow}`)
        .then((data) => data);
}

/**
 * Gets Billing Agreement
 * After buyer approval, you use a billing agreement token to create the agreement.
 *
 * @param {string} billingToken - billing agreement token
 * @returns {Object} JSON response body that includes the billing agreement ID,
 * the state of the agreement, which is ACTIVE, and information about the payer
 */
function createBillingAgreementCall(billingToken) {
    return $.ajax({
        url: window.paypalUrls.createBillingAgreement,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ billingToken })
    });
}

/**
 * Gets Order Details
 *
 * @param {string} orderId - billing agreement token
 * @returns {Object} JSON response body that includes payer email
 */
function getOrderDetailsCall(orderId) {
    return $.get(window.paypalUrls.getOrderDetails + `?orderId=${orderId}`)
        .then((data) => data);
}

/**
 * Calls to returnFromCart endpoint, redirects to place order stage or shows error if it exists
 *
 * @returns {Object} Call handling result
 */
function returnFromCart() {
    loader.show();
    let payerEmail = document.querySelector('#paypal_image').getAttribute('data-paypal-default-ba-email');
    return $.ajax({
        url: window.paypalUrls.returnFromCart,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            payerEmail: payerEmail
        }),
        success: () => {
            loader.hide();
            window.location.href = window.paypalUrls.placeOrderStage;
        },
        error: function (err) {
            loader.hide();
            showCartErrorHtml(err.responseText);
        }
    });
}

/**
 * Call finishLpmOrder endpoint
 * @param  {Object} details billing address details
 * @returns {Promise} ajax call
 */
function finishLpmOrder(details) {
    const lpmName = document.querySelector('#usedPaymentMethod').value;
    const paypalMethodId = document.querySelector('#paypalMethodId').value;
    return $.ajax({
        url: window.paypalUrls.finishLpmOrder,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            details,
            lpmName,
            paypalMethodId
        })
    });
}

export {
    updateOrderData,
    getPurchaseUnits,
    getBillingAgreementToken,
    createBillingAgreementCall,
    getOrderDetailsCall,
    returnFromCart,
    showCartErrorHtml,
    showCheckoutErrorHtml,
    finishLpmOrder
};
