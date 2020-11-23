import {
    hideContinueButton,
    isNewAccountSelected,
    showContinueButton,
    showPaypalBlock
} from '../billingHelper';

let $billingBAbutton = document.querySelector('.paypal-checkout-ba-button');
let $restPaypalAccountsList = document.querySelector('#restPaypalAccountsList');
let $paypalAccountSave = document.querySelector('#savePaypalAccount');
let $paypalAccountMakeDefault = document.querySelector('#paypalAccountMakeDefault');

/** Shows PayPal BA button if it's not visible and hides continue button
*/
function showPaypalBABtn() {
    if (!$billingBAbutton) {
        $billingBAbutton = document.querySelector('.paypal-checkout-ba-button');
    }
    if ($billingBAbutton.style.display !== 'block') {
        $billingBAbutton.style.display = 'block';
    }
    hideContinueButton();
}

/** Hides PayPal BA button if it's not hidden and shows continue button
*/
function hidePaypalBABtn() {
    if (!$billingBAbutton) {
        $billingBAbutton = document.querySelector('.paypal-checkout-ba-button');
    }
    if ($billingBAbutton.style.display !== 'none') {
        $billingBAbutton.style.display = 'none';
    }
    showContinueButton();
}

/** Put value of checkbox makeDefault/saveAccount for backend
*/
function saveCheckboxState() {
    var $paypal_makeDefault = document.querySelector('#paypal_makeDefault');
    var $paypal_saveAccount = document.querySelector('#paypal_saveAccount');
    $paypal_makeDefault.value = $paypalAccountMakeDefault.checked;
    $paypal_saveAccount.value = $paypalAccountSave.checked;
}

/** Handle makeDefault/saveAccount checkboxes state on change
*/
function handleCheckboxChange() {
    let $selectedAccount = $restPaypalAccountsList.querySelector('option:checked');
    let isSessionAccountAppended = JSON.parse($selectedAccount.getAttribute('data-append'));
    let hasDefaultPaymentMethod = JSON.parse($restPaypalAccountsList.getAttribute('data-has-default-account'));

    if (isSessionAccountAppended || $selectedAccount.value === 'newaccount') {
        if (!$paypalAccountSave.checked) {
            $paypalAccountMakeDefault.checked = false;
            $paypalAccountMakeDefault.disabled = true;
        } else {
            $paypalAccountMakeDefault.disabled = false;
            if (!hasDefaultPaymentMethod) {
                $paypalAccountMakeDefault.checked = true;
            }
        }
    }
    saveCheckboxState();
}

/** Show/hide/check/disable checkboxes depends on selected type of account
*/
function toggleCustomCheckbox() {
    let $selectedAccount = $restPaypalAccountsList.querySelector('option:checked');
    let $paypalAccountMakeDefaultContainer = document.querySelector('#paypalAccountMakeDefaultContainer');
    let $paypalAccountSaveContainer = document.querySelector('#savePaypalAccountContainer');
    let hasPPSavedAccount = JSON.parse($restPaypalAccountsList.getAttribute('data-has-saved-account'));
    let hasDefaultPaymentMethod = JSON.parse($restPaypalAccountsList.getAttribute('data-has-default-account'));
    let isSessionAccountAppended = JSON.parse($selectedAccount.getAttribute('data-append'));
    let isBALimitReached = JSON.parse($restPaypalAccountsList.getAttribute('data-ba-limit-reached'));

    if ($paypalAccountSaveContainer) {
        if ($selectedAccount.dataset.default === 'true') {
            $paypalAccountMakeDefaultContainer.style.display = 'none';
            if (hasPPSavedAccount && !hasDefaultPaymentMethod) {
                $paypalAccountMakeDefault.checked = true;
                $paypalAccountMakeDefault.disabled = false;
                $paypalAccountSave.checked = true;
                saveCheckboxState();
            } else {
                $paypalAccountSaveContainer.style.display = 'none';
            }
        }

        if ($selectedAccount.dataset.default === 'false' && !($selectedAccount.value === 'newaccount') && !isSessionAccountAppended) {
            $paypalAccountMakeDefaultContainer.style.display = 'block';
            $paypalAccountSaveContainer.style.display = 'none';
            $paypalAccountSave.checked = false;
            $paypalAccountMakeDefault.disabled = false;
        }

        if ($selectedAccount.value === 'newaccount' || isSessionAccountAppended) {
            if (!hasPPSavedAccount) {
                $paypalAccountMakeDefaultContainer.style.display = 'none';
                $paypalAccountMakeDefault.checked = true;
                $paypalAccountMakeDefault.disabled = false;
                saveCheckboxState();
                return;
            }
            handleCheckboxChange();

            if (isBALimitReached) {
                $paypalAccountSaveContainer.style.display = 'none';
                $paypalAccountMakeDefaultContainer.style.display = 'none';
            } else {
                $paypalAccountSaveContainer.style.display = 'block';
                $paypalAccountMakeDefaultContainer.style.display = 'block';
            }

            if (hasDefaultPaymentMethod) {
                return;
            }
            hasPPSavedAccount && !hasDefaultPaymentMethod ?
                $paypalAccountMakeDefaultContainer.style.display = 'none' :
                $paypalAccountMakeDefault.disabled = true;

            $paypalAccountMakeDefault.checked = true;
        }
    }
}

/** Show billing agreement btn - hide paypal btn and vise versa
*/
function toggleBABtnVisibility() {
    toggleCustomCheckbox();

    if (isNewAccountSelected($restPaypalAccountsList)) {
        showPaypalBABtn();
        hideContinueButton();
        return;
    }
    hidePaypalBABtn();
    showPaypalBlock();
}

/** Assign billing agreement emails on change into input field
*/
function assignEmailForSavedBA() {
    let $paypalActiveAccount = document.querySelector('#paypal_activeAccount');
    let $contractInfoeEmail = document.querySelector('input[name=dwfrm_billing_contactInfoFields_email]');

    if (isNewAccountSelected($restPaypalAccountsList)) {
        $paypalActiveAccount.value = '';
        $contractInfoeEmail.value = '';
    } else {
        $paypalActiveAccount.value = $restPaypalAccountsList.querySelector('option:checked').value;
        $contractInfoeEmail.value = $paypalActiveAccount.value;
    }
}

/**
 *  Append element to an Existing restPaypalAccountsList Collection
 *
 * @param {string} email - billing agreement email
 */
function appendOption(email) {
    var $select = document.querySelector('#restPaypalAccountsList');
    var option = document.createElement('option');

    option.text = email;
    option.value = email;
    option.classList.add('sessionBA');
    option.setAttribute('data-append', true);
    option.selected = 'selected';

    $select.add(option, $select[1]);
    $select.value = email;
    toggleBABtnVisibility();
}

/**
 *  Update element under restPaypalAccountsList Collection
 *
 * @param {string} email - billing agreement email
 */
function updateOption(email) {
    var $option = document.querySelector('#restPaypalAccountsList .sessionBA');

    $option.text = email;
    $option.value = email;
    $option.selected = 'selected';
    document.querySelector('#restPaypalAccountsList').value = email;

    hidePaypalBABtn();
    showContinueButton();
}

/**
 *  Attribute already exist
 *
 * @returns {boolean} append element Exist under restPaypalAccountsList Collection
 */
function dataAppendAttributeExist() {
    var $select = document.querySelector('#restPaypalAccountsList .sessionBA');
    return $select ? !!$select.getAttribute('data-append') : false;
}

export {
    toggleBABtnVisibility,
    assignEmailForSavedBA,
    handleCheckboxChange,
    appendOption,
    updateOption,
    dataAppendAttributeExist
};
