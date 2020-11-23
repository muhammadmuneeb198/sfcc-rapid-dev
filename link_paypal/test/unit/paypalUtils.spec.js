const { paypalUtilsPath } = require('./path');
const proxyquire = require('proxyquire').noCallThru();
const { expect } = require('chai');
const { stub, assert } = require('sinon');

require('dw-api-mock/demandware-globals');
require('babel-register')({
    plugins: ['babel-plugin-rewire']
});

const get = stub();
const put = stub();
const restService = { configuration: { credential: { user: 'g12346F' } } };
const disableFunds = ['sepa', 'bancontact', 'eps', 'giropay', 'ideal', 'mybank', 'p24', 'sofort'];

let paypalPreferences = {
    billingAgreementEnabled: undefined,
    isCapture: undefined,
    enabledLPMs: undefined
};

const paypalUtils = proxyquire(paypalUtilsPath, {
    'dw/system/CacheMgr': {
        getCache: () => ({
            get,
            put
        })
    },
    'dw/svc/LocalServiceRegistry': {
        createService: () => { return restService; }
    },
    '../../config/sdkConfig': {
        disableFunds,
        allowedCurrencies: []
    },
    '../../config/paypalPreferences': paypalPreferences
});

describe('paypalUtils file', () => {
    describe('getClientId', () => {
        const getClientId = paypalUtils.__get__('getClientId');
        describe('if client id exists in cash', () => {
            before(() => {
                get.returns('g12345D');
            });
            after(() => {
                get.reset();
            });
            it('should return client id from cash', () => {
                expect(getClientId()).to.be.equals('g12345D');
            });
        });

        describe('if client doesn`t exist in cash', () => {
            before(() => {
                get.returns(null);
            });
            after(() => {
                get.reset();
            });
            it('should create client id, save it in cash and return from cash', () => {
                expect(getClientId()).to.be.equals('g12346F');
            });
            it('should put client id to cash', () => {
                assert.calledWith(put, 'clientId', 'g12346F');
            });
        });
    });
    describe('createCartSDKUrl', () => {
        const createCartSDKUrl = paypalUtils.__get__('createCartSDKUrl');
        const clientID = 'AdYw0mYpZkz6qk3RNTmDTDAnNhWwUpL_zawBcv7wjinBmcm9b-10rKlRDwmRUzjcOwScbT9xDsiodvAu';
        const disabledFunding = '&disable-funding=sepa,bancontact,eps,giropay,ideal,mybank,p24,sofort';
        before(() => {
            session = {
                currency: {
                    currencyCode: 'USD'
                }
            };
            customer = {
                authenticated: true
            };
            paypalUtils.__set__('getClientId', () => {
                return clientID;
            });
            paypalUtils.__set__('isAllowedCurrency', () => {
                return true;
            });
            paypalUtils.__set__('disabledPaymentOptions', () => {
                return disableFunds;
            });
        });
        after(() => {
            session = {};
            paypalUtils.__ResetDependency__('isAllowedCurrency', () => {
                return true;
            });
        });

        describe('if paymentAction is Auth and billing agreement is disabled', () => {
            before(() => {
                paypalPreferences.isCapture = false;
                paypalPreferences.billingAgreementEnabled = false;
                customer = {
                    authenticated: false
                };
            });
            after(() => {
                paypalPreferences.isCapture = undefined;
                paypalPreferences.billingAgreementEnabled = undefined;
                customer = {};
            });
            const url = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=false' + '&intent=authorize' + '&currency=USD' + disabledFunding;
            it('should append "&intent=authorize" to url, currency and disabled funds', () => {
                expect(createCartSDKUrl()).to.be.equals(url);
            });
        });

        describe('if paymentAction is Capture and billing agreement is disabled', () => {
            before(() => {
                paypalUtils.__set__('isCapture', true);
                paypalUtils.__set__('billingAgreementEnabled', false);
                customer = {
                    authenticated: false
                };
            });
            after(() => {
                customer = {};
            });
            const url = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=false' + '&currency=USD' + disabledFunding;
            it('should append only currency and disabled funding to url', () => {
                expect(createCartSDKUrl()).to.be.equals(url);
            });
        });

        describe('if billing agreement is enabled', () => {
            before(() => {
                paypalUtils.__set__('isCapture', false);
                paypalUtils.__set__('billingAgreementEnabled', true);
                customer = {
                    authenticated: true
                };
            });
            after(() => {
                customer = {};
            });
            const url = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=false' + '&vault=true' + '&currency=USD' + disabledFunding;
            it('should append &vault=true to url, currency and disabled funds', () => {
                expect(createCartSDKUrl()).to.be.equals(url);
            });
        });

        describe('if currency is not allowed', () => {
            before(() => {
                paypalUtils.__set__('isCapture', true);
                paypalUtils.__set__('billingAgreementEnabled', false);
                customer = {
                    authenticated: true
                };
                paypalUtils.__set__('isAllowedCurrency', () => {
                    return false;
                });
            });
            after(() => {
                paypalUtils.__ResetDependency__('isAllowedCurrency', () => {
                    return true;
                });
                customer = {};
            });
            const url = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=false' + disabledFunding;
            it('should append only disabled funding to url', () => {
                expect(createCartSDKUrl()).to.be.equals(url);
            });
        });
    });
    describe('createBillingSDKUrl', () => {
        const createBillingSDKUrl = paypalUtils.__get__('createBillingSDKUrl');
        const clientID = 'AdYw0mYpZkz6qk3RNTmDTDAnNhWwUpL_zawBcv7wjinBmcm9b-10rKlRDwmRUzjcOwScbT9xDsiodvAu';
        const disabledFunding = '&disable-funding=sepa,bancontact,eps,giropay,ideal,mybank,p24,sofort';
        before(() => {
            session = {
                currency: {
                    currencyCode: 'USD'
                }
            };
            customer = {
                authenticated: true
            };
            paypalUtils.__set__('getClientId', () => {
                return clientID;
            });
            paypalUtils.__set__('isAllowedCurrency', () => {
                return true;
            });
            paypalUtils.__set__('disabledPaymentOptions', () => {
                return disableFunds;
            });
        });
        after(() => {
            session = {};
            paypalUtils.__ResetDependency__('isAllowedCurrency', () => {
                return true;
            });
        });

        describe('if paymentAction is Auth and billing agreement is disabled', () => {
            before(() => {
                paypalUtils.__set__('isCapture', false);
                paypalUtils.__set__('billingAgreementEnabled', false);
                paypalUtils.__set__('enabledLPMs', ['sofort']);
                customer = {
                    authenticated: false
                };
            });
            after(() => {
                customer = {};
            });
            const url = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=false' + '&intent=authorize' + '&currency=USD' + disabledFunding;
            it('should append "&intent=authorize" to url, currency and disabled funds', () => {
                expect(createBillingSDKUrl()).to.be.equals(url);
            });
        });

        describe('if paymentAction is Capture and billing agreement is disabled', () => {
            before(() => {
                paypalUtils.__set__('isCapture', true);
                paypalUtils.__set__('billingAgreementEnabled', false);
                paypalUtils.__set__('enabledLPMs', ['sofort']);
                customer = {
                    authenticated: false
                };
            });
            after(() => {
                customer = {};
            });
            const url = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=true' + '&currency=USD' + disabledFunding;
            it('should append only currency and disabled funding to url', () => {
                expect(createBillingSDKUrl()).to.be.equals(url);
            });
        });

        describe('if billing agreement is enabled', () => {
            before(() => {
                paypalUtils.__set__('isCapture', false);
                paypalUtils.__set__('billingAgreementEnabled', true);
                paypalUtils.__set__('enabledLPMs', undefined);
                customer = {
                    authenticated: true
                };
            });
            after(() => {
                customer = {};
            });
            const url = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=false' + '&vault=true' + '&currency=USD' + disabledFunding;
            it('should append &vault=true to url, currency and disabled funds', () => {
                expect(createBillingSDKUrl()).to.be.equals(url);
            });
        });

        describe('if currency is not allowed', () => {
            before(() => {
                paypalUtils.__set__('isCapture', true);
                paypalUtils.__set__('billingAgreementEnabled', false);
                paypalUtils.__set__('enabledLPMs', ['sofort']);
                customer = {
                    authenticated: true
                };
                paypalUtils.__set__('isAllowedCurrency', () => {
                    return false;
                });
            });
            after(() => {
                paypalUtils.__ResetDependency__('isAllowedCurrency', () => {
                    return true;
                });
                customer = {};
            });
            const url = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&commit=true' + disabledFunding;
            it('should append only disabled funding to url', () => {
                expect(createBillingSDKUrl()).to.be.equals(url);
            });
        });
    });
});
