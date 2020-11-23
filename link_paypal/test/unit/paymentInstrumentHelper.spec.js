const { paymentInstrumentHelperPath } = require('./path');
const proxyquire = require('proxyquire').noCallThru();
const { expect } = require('chai');

require('dw-api-mock/demandware-globals');
require('babel-register')({
    plugins: ['babel-plugin-rewire']
});
const paypalProcessorId = 'PAYPAL';
const paypalPaymentMethodId = 'PayPal';

const paymentInstrumentHelper = proxyquire(paymentInstrumentHelperPath, {
    '../../../config/paypalPreferences': {
        paypalProcessorId,
        paypalPaymentMethodId
    }
});

describe('paymentInstrmentHelper file', () => {
    describe('getPaypalPaymentInstrument', () => {
        const getPaypalPaymentInstrument = paymentInstrumentHelper.__get__('getPaypalPaymentInstrument');
        let basket;
        let paymentInstruments;
        describe('if paymentInstrument with paypal as payment method id is not empty', () => {
            before(() => {
                paymentInstruments = [{ Array: {} }];
                basket = {
                    getPaymentInstruments: (paypalPaymentMethodId) => {
                        return paymentInstruments;
                    }
                };
            });
            after(() => {
                basket = {};
                paymentInstruments = null;
            });
            it('return paypal payment instrument', () => {
                expect(getPaypalPaymentInstrument(basket)).to.be.equal(paymentInstruments[0]);
            });
        });

        describe('if payment instrument is empty', () => {
            before(() => {
                paymentInstruments = [{}];
                basket = {
                    getPaymentInstruments: (paypalPaymentMethodId) => {
                        () => {
                            return paymentInstruments;
                        };
                    }
                };
            });
            after(() => {
                basket = {};
                paymentInstruments = null;
            });
            it('return false', () => {
                expect(getPaypalPaymentInstrument(basket)).to.be.equal(false);
            });
        });
    });
});

describe('calculateNonGiftCertificateAmount', () => {
    const calculateNonGiftCertificateAmount = paymentInstrumentHelper.__get__('calculateNonGiftCertificateAmount');
    let Decimal = function (value) {
        this.value = value;
    };
    Decimal.prototype.subtract = function (money) {
        return new Decimal(this.value - money.value);
    };
    Decimal.prototype.value = null;

    let getAmount = new dw.value.Money(20);
    const gcPaymentInstrs = {
        iterator: () => {
            return new dw.util.Iterator([{
                getPaymentTransaction: () => ({
                    getAmount: () => {
                        return getAmount;
                    }
                })
            }]);
        }
    };

    let lineItemCtnr = {
        currencyCode: 'USD',
        getGiftCertificatePaymentInstruments: () => gcPaymentInstrs,
        totalGrossPrice: new dw.value.Money(100)
    };

    it('should return amount after discount', () => {
        expect(calculateNonGiftCertificateAmount(lineItemCtnr).value).to.be.equal(80);
    });
});
