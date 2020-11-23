/* eslint-disable no-useless-escape */
/* eslint-disable no-control-regex */
import { getBillingAgreementToken, createBillingAgreementCall, showCheckoutErrorHtml } from '../../api';
import { appendOption, dataAppendAttributeExist, updateOption } from './billingAgreementHelper';

const loaderInstance = require('../../loader');
const regExprEmail = new RegExp(/(?:[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+)*|(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/);
let $loaderContainer = document.querySelector('.paypalLoader');
let loader = loaderInstance($loaderContainer);

/**
 * Check for contactInfoEmail input field if not empty
 *
 * @param {Object} _ - arg
 * @param {Object} actions - paypal actions
 * @returns {Function} reject - if incorrect email
 */
function onClick(_, actions) {
    let $contactInfoEmail = document.querySelector('input[name=dwfrm_billing_contactInfoFields_email]');
    let errDiv = $contactInfoEmail.parentElement.querySelector('.invalid-feedback');
    let errStr = 'Please enter a valid email address';
    if ($contactInfoEmail.value.trim() !== ''
        && !regExprEmail.test($contactInfoEmail.value)) {
        showCheckoutErrorHtml(errStr);
        errDiv.innerText = errStr;
        errDiv.style = 'display: block';
        $contactInfoEmail.style = 'border-color: red';
        return actions.reject();
    }

    errDiv.innerText = '';
    errDiv.style = 'display: none';
    $contactInfoEmail.style = 'border-color: rgb(206, 212, 218)';
}

/**
 *  Create's Billing Agreement
 *
 * @returns {string} returns JSON response that includes an data token
 */
function createBillingAgreement() {
    loader.show();
    return getBillingAgreementToken()
        .then((data) => data.token)
        .fail(() => {
            loader.hide();
        });
}

/**
 *  Makes post call using facilitator Access Token and transfers billingToken
 *  save's billingAgreementID & billingAgreementPayerEmail to input field
 *  and triggers checkout place order stage
 *
 * @param {string} billingToken - billing agreement token
 * @returns {Object} JSON response that includes the billing agreement ID and information about the payer
 */
function onApprove({ billingToken }) {
    return createBillingAgreementCall(billingToken)
        .then(({ id, payer }) => {
            let payerEmail = payer.payer_info.email;
            document.getElementById('billingAgreementID').value = id;
            document.getElementById('billingAgreementPayerEmail').value = payerEmail;
            var $contactInfoEmail = document.querySelector('input[name=dwfrm_billing_contactInfoFields_email]');
            if ($contactInfoEmail.value.trim() === '') {
                $contactInfoEmail.value = payerEmail;
            }
            document.querySelector('button.submit-payment').click();

            if (!Array.from(document.querySelector('#restPaypalAccountsList').options)
                .some(el => el.value === payerEmail)) {
                dataAppendAttributeExist() ?
                    updateOption(payerEmail) :
                    appendOption(payerEmail);
            }

            loader.hide();
        })
        .fail(() => {
            loader.hide();
        });
}

/**
 * Hides loader on paypal widget closing without errors

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
    showCheckoutErrorHtml('An internal server error has occurred. \r\nRetry the request later.');
}

/**
 *Inits paypal Billing Agreement button on billing checkout page
 */
function initPaypalBAButton() {
    loader.show();
    window.paypal.Buttons({
        onClick,
        createBillingAgreement,
        onApprove,
        onCancel,
        onError
    }).render('.paypal-checkout-ba-button')
        .then(() => {
            loader.hide();
        });
}

export default initPaypalBAButton;
