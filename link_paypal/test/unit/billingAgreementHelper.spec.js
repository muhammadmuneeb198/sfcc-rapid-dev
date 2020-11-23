const { billingAgreementHelperPath } = require('./path');
const proxyquire = require('proxyquire').noCallThru();
const { expect } = require('chai');
const { stub, assert } = require('sinon');

require('dw-api-mock/demandware-globals');
require('babel-register')({
    plugins: ['babel-plugin-rewire']
});

const billingAgreementEnabled = true;
const billingAgreementHelper = proxyquire(billingAgreementHelperPath, {
    '../../../config/paypalPreferences': {
        billingAgreementEnabled
    }
});
