const Transaction = require('dw/system/Transaction');
const {
    createErrorLog
} = require('../scripts/paypal/paypalUtils');

const billingAgreementLimit = 3;

/**
 * BA model
 */
function BillingAgreementModel() {
    let savedBillingAgreements;
    try {
        let savedAccounts = customer.profile.custom.PP_API_billingAgreement;
        if (!empty(savedAccounts)) {
            savedBillingAgreements = JSON.parse(savedAccounts);
        }
    } catch (error) {
        createErrorLog(error);
    }
    this.billingAgreements = !empty(savedBillingAgreements) ? savedBillingAgreements : [];
}

/**
 * Return billing agreement from customers profile
 * @returns {Array} Saved billing agreements
 */
BillingAgreementModel.prototype.getBillingAgreements = function () {
    return this.billingAgreements;
};

/**
 * Save new billing agreement to customers profile
 * @param  {Object} usedBillingAgreement Billing agreement to add
 */
BillingAgreementModel.prototype.saveBillingAgreement = function (usedBillingAgreement) {
    if (this.isBaLimitReached()) return;

    if (usedBillingAgreement.saveToProfile) {
        delete usedBillingAgreement.saveToProfile;
        this.billingAgreements.push(usedBillingAgreement);
    }

    if (usedBillingAgreement.default) {
        this.changeDefaultBillingAgreement(usedBillingAgreement);
    }

    this.updateProfile();
};

/**
 * Update existed billing agreement
 * @param  {Object} usedBillingAgreement Billing agreement to update
 */
BillingAgreementModel.prototype.updateBillingAgreement = function (usedBillingAgreement) {
    let isDefaultAccount = this.getBillingAgreementByEmail(usedBillingAgreement.email).default;
    if (!isDefaultAccount && usedBillingAgreement.default) {
        this.changeDefaultBillingAgreement(usedBillingAgreement);
        this.updateProfile();
    }
};

/**
 * Change default billing agreement in customers profile
 * @param  {Object} usedBillingAgreement New default billing agreement
 */
BillingAgreementModel.prototype.changeDefaultBillingAgreement = function (usedBillingAgreement) {
    this.billingAgreements.forEach(function (billingAgreement) {
        billingAgreement.default = billingAgreement.baID === usedBillingAgreement.baID;
    });
};

/**
 * Get default billing agreement in profile
 * @returns {Object} Default billing agreement
 */
BillingAgreementModel.prototype.getDefaultBillingAgreement = function () {
    let defaultBa;
    this.billingAgreements.forEach(function (billingAgreement) {
        if (billingAgreement.default) {
            defaultBa = billingAgreement;
        }
    });
    return defaultBa;
};

/**
 * Check if customer reached allowed number of billing agreements
 * @returns {boolean} Is limit reached
 */
BillingAgreementModel.prototype.isBaLimitReached = function () {
    return this.billingAgreements.length === billingAgreementLimit;
};

/**
 * Update customer PP_API_billingAgreement with new data
 */
BillingAgreementModel.prototype.updateProfile = function () {
    let billingAgreements = this.getBillingAgreements();
    if (empty(billingAgreements)) return;
    Transaction.wrap(function () {
        customer.profile.custom.PP_API_billingAgreement = JSON.stringify(billingAgreements);
    });
};

/**
 * Get billing agreement from profile by email
 * @param  {string} email Email to look
 * @returns {Object} Billing agreements
 */
BillingAgreementModel.prototype.getBillingAgreementByEmail = function (email) {
    return this.billingAgreements.filter(function (billingAgreement) {
        return billingAgreement.email === email;
    })[0];
};

/**
 * Check if email already exist in billing agreements list
 * @param  {string} email Email to look
 * @returns {boolean} Billing agreement status
 */
BillingAgreementModel.prototype.isAccountAlreadyExist = function (email) {
    return this.billingAgreements.some(function (billingAgreement) {
        return billingAgreement.email === email;
    });
};

module.exports = BillingAgreementModel;
