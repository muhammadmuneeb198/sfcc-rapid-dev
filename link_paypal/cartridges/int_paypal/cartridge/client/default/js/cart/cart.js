import initPaypalButton from './initCartButton';
import initPaypalBAButton from './registered/initBillingAgreementButton';
import { updateOrderData, returnFromCart } from '../api';

let $paypalImage = document.querySelector('#paypal_image');
let $cartButton = document.querySelector('.js_paypal_button_on_cart_page');
let $isCustomerAuthenticated = $cartButton && JSON.parse($cartButton.getAttribute('data-paypal-customer-authenticated'));
let $isBAEnabled = $cartButton && JSON.parse($cartButton.getAttribute('data-paypal-ba-enabled'));
const paypalUrls = document.querySelector('.js_paypal-content').getAttribute('data-paypal-urls');
window.paypalUrls = JSON.parse(paypalUrls);

if (window.paypal) {
    $isCustomerAuthenticated && $isBAEnabled ?
        initPaypalBAButton() :
        initPaypalButton();
} else if ($paypalImage) {
    let isUpdateRequired = JSON.parse($paypalImage.getAttribute('data-is-update-required'));
    $paypalImage.addEventListener('click', isUpdateRequired ? updateOrderData : returnFromCart);
}
