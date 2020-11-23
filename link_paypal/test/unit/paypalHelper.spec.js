const { paypalHelperPath } = require('./path');
const proxyquire = require('proxyquire').noCallThru();
const { expect } = require('chai');
const { stub, assert } = require('sinon');

require('dw-api-mock/demandware-globals');
require('babel-register')({
    plugins: ['babel-plugin-rewire']
});

const encodeString = stub();
const paypalPaymentMethodId = 'PayPal';
const billingAgreementDescription = 'billingAgreementDescription';
const getShippingAddress = stub();
const currentBasket = {
    getDefaultShipment: () => ({
        getShippingAddress
    })
};

const paypalHelper = proxyquire(paypalHelperPath, {
    '../../../config/paypalPreferences': {
        paypalPaymentMethodId,
        billingAgreementDescription
    },
    '../paypalUtils': {
        encodeString
    },
    'dw/order/BasketMgr': {
        currentBasket
    }
});

describe('paypalHelper file', () => {
    describe('isExpiredTransaction', () => {
        const isExpiredTransaction = paypalHelper.__get__('isExpiredTransaction');
        let creationDate;
        let dateNow = Date.parse(new Date());
        let getTime = 1584088139000;

        /* eslint-disable */
        Date = function () {
            return {
                getTime: function () {
                    return getTime;
                }
            };
        };
        /* eslint-enable */

        Date.now = stub().returns(dateNow);
        Date.parse = stub().returns(creationDate);

        describe('Transaction Expired', () => {
            before(() => {
                creationDate = 1584087421000;
            });

            it('returns true', () => {
                expect(isExpiredTransaction(creationDate)).to.be.equals(true);
            });
        });

        describe('Transaction Valid', () => {
            before(() => {
                creationDate = dateNow;
                getTime = dateNow + 1584347339000;
            });

            it('returns false', () => {
                expect(isExpiredTransaction(creationDate)).to.be.equals(false);
            });
        });
    });

    describe('isPurchaseUnitChanged', () => {
        const isPurchaseUnitChanged = paypalHelper.__get__('isPurchaseUnitChanged');
        let purchaseUnit = {
            amount: {
                currecy_code: 'USD',
                value: '244.23'
            },
            address: {}
        };
        describe('if orderDataHash is undefined', () => {
            before(() => {
                encodeString.withArgs(purchaseUnit).returns('123');
                session.privacy.orderDataHash = undefined;
            });
            after(() => {
                encodeString.reset();
                session.privacy.orderDataHash = undefined;
            });
            it('should return true', () => {
                expect(isPurchaseUnitChanged(purchaseUnit)).to.be.equals(true);
            });
        });

        describe('if encoded purchaseUnit equals to orderDataHash', () => {
            before(() => {
                encodeString.withArgs(purchaseUnit).returns('123');
                session.privacy.orderDataHash = '123';
            });
            after(() => {
                encodeString.reset();
                session.privacy.orderDataHash = undefined;
            });
            it('should return false', () => {
                expect(isPurchaseUnitChanged(purchaseUnit)).to.be.equals(false);
            });
        });

        describe('if encoded purchaseUnit is not equal to orderDataHash', () => {
            before(() => {
                encodeString.withArgs(purchaseUnit).returns('123');
                session.privacy.orderDataHash = '321';
            });
            after(() => {
                encodeString.reset();
                session.privacy.orderDataHash = undefined;
            });
            it('should return true', () => {
                expect(isPurchaseUnitChanged(purchaseUnit)).to.be.equals(true);
            });
        });
    });

    describe('cartPaymentForm', () => {
        const cartPaymentForm = paypalHelper.__get__('cartPaymentForm');
        let data = {};

        describe('if billing agreement is disabled and paypalOrderID exists', () => {
            before(() => {
                data = {
                    paypalData: {
                        paypalOrderID: '9D681170216583748',
                        payerEmail: undefined,
                        billingAgreementId: undefined
                    }
                };
            });
            after(() => {
                data = {};
            });
            it('should return payment form object with order id', () => {
                expect(cartPaymentForm(data)).to.deep.equal({
                    billingForm: {
                        paymentMethod: {
                            value: 'PayPal'
                        },
                        paypal: {
                            paypalOrderID: {
                                value: '9D681170216583748'
                            },
                            paypalActiveAccount: {
                                htmlValue: undefined
                            },
                            billingAgreementID: {
                                htmlValue: undefined
                            },
                            makeDefaultPaypalAccount: {
                                checked: true
                            },
                            savePaypalAccount: {
                                checked: true
                            }
                        }
                    }
                });
            });
        });

        describe('if billing agreement is enabled and BA id exists', () => {
            before(() => {
                data = {
                    paypalData: {
                        paypalOrderID: undefined,
                        payerEmail: 'epamtester@pptest.com',
                        billingAgreementId: 'B-36731823N9661964X'
                    }
                };
            });
            after(() => {
                data = {};
            });
            it('should return payment form object with BA id', () => {
                expect(cartPaymentForm(data)).to.deep.equal({
                    billingForm: {
                        paymentMethod: {
                            value: 'PayPal'
                        },
                        paypal: {
                            paypalOrderID: {
                                value: undefined
                            },
                            paypalActiveAccount: {
                                htmlValue: 'epamtester@pptest.com'
                            },
                            billingAgreementID: {
                                htmlValue: 'B-36731823N9661964X'
                            },
                            makeDefaultPaypalAccount: {
                                checked: true
                            },
                            savePaypalAccount: {
                                checked: true
                            }
                        }
                    }
                });
            });
        });

        describe('if billing agreement is enabled and BA email exists', () => {
            before(() => {
                data = {
                    paypalData: {
                        paypalOrderID: undefined,
                        payerEmail: 'epamtester@pptest.com',
                        billingAgreementId: undefined
                    }
                };
            });
            after(() => {
                data = {};
            });
            it('should return payment form object with BA email', () => {
                expect(cartPaymentForm(data)).to.deep.equal({
                    billingForm: {
                        paymentMethod: {
                            value: 'PayPal'
                        },
                        paypal: {
                            paypalOrderID: {
                                value: undefined
                            },
                            paypalActiveAccount: {
                                htmlValue: 'epamtester@pptest.com'
                            },
                            billingAgreementID: {
                                htmlValue: undefined
                            },
                            makeDefaultPaypalAccount: {
                                checked: true
                            },
                            savePaypalAccount: {
                                checked: true
                            }
                        }
                    }
                });
            });
        });
    });

    describe('updateCustomerEmail', () => {
        const updateCustomerEmail = paypalHelper.__get__('updateCustomerEmail');
        const basket = {
            setCustomerEmail: stub(),
            customerEmail: undefined
        };
        let billingData;

        describe('if email is entered by user, email was not already set to basket and data form is without errors', () => {
            before(() => {
                billingData = {
                    email: {
                        value: 'test@test.com'
                    }
                };
                updateCustomerEmail(basket, billingData);
            });
            after(() => {
                billingData = {};
            });
            it('should set customer`s email to basket', () => {
                assert.calledWith(basket.setCustomerEmail, 'test@test.com');
            });
        });

        describe('if email is entered by user, email in basket differs from entered and data form is without errors', () => {
            before(() => {
                billingData = {
                    email: {
                        value: 'test@test.com'
                    }
                };
                basket.customerEmail = 'epamtester@pptest.com';
                updateCustomerEmail(basket, billingData);
            });
            after(() => {
                billingData = {};
                basket.customerEmail = undefined;
            });
            it('should set customer`s email to basket', () => {
                assert.calledWith(basket.setCustomerEmail, 'test@test.com');
            });
        });

        describe('if email is entered by user, email was not already set to basket and data form is with errors', () => {
            before(() => {
                billingData = {
                    form: {
                        contactInfoFields: {
                            email: {
                                htmlValue: 'test@test.com'
                            }
                        }
                    }
                };
                updateCustomerEmail(basket, billingData);
            });
            after(() => {
                billingData = {};
            });
            it('should set customer`s email to basket', () => {
                assert.calledWith(basket.setCustomerEmail, 'test@test.com');
            });
        });

        describe('if email is entered by user, email in basket differs from entered and data form is with errors', () => {
            before(() => {
                billingData = {
                    form: {
                        contactInfoFields: {
                            email: {
                                htmlValue: 'test@test.com'
                            }
                        }
                    }
                };
                basket.customerEmail = 'epamtester@pptest.com';
                updateCustomerEmail(basket, billingData);
            });
            after(() => {
                billingData = {};
                basket.customerEmail = undefined;
            });
            it('should set customer`s email to basket', () => {
                assert.calledWith(basket.setCustomerEmail, 'test@test.com');
            });
        });
    });

    describe('isErrorEmail', () => {
        const isErrorEmail = paypalHelper.__get__('isErrorEmail');
        let billingData;

        describe('if billingData is empty', () => {
            before(() => {
                billingData = {};
            });
            after(() => {
                billingData = {};
            });
            it('should return false', () => {
                expect(isErrorEmail(billingData)).to.be.equals(false);
            });
        });

        describe('if there is email in form and error field is not empty', () => {
            before(() => {
                billingData = {
                    form: {
                        contactInfoFields: {
                            email: {
                                htmlValue: 'test@test.com'
                            }
                        }
                    },
                    fieldErrors: [{ dwfrm_billing_contactInfoFields_email: 'Please enter your email id' }],
                    error: true
                };
            });
            after(() => {
                billingData = {};
            });
            it('should return true', () => {
                expect(isErrorEmail(billingData)).to.be.equals(true);
            });
        });

        describe('if billingData contains email and there are no errors', () => {
            before(() => {
                billingData = {
                    form: {
                        contactInfoFields: {
                            email: {
                                htmlValue: 'test@test.com'
                            }
                        }
                    }
                };
            });
            after(() => {
                billingData = {};
            });
            it('should return false', () => {
                expect(isErrorEmail(billingData)).to.be.equals(false);
            });
        });
    });

    describe('createErrorEmailResponse', () => {
        const createErrorEmailResponse = paypalHelper.__get__('createErrorEmailResponse');
        let billingData;

        describe('if billingData is empty', () => {
            before(() => {
                billingData = undefined;
            });
            after(() => {
                billingData = undefined;
            });
            it('should return false', () => {
                expect(createErrorEmailResponse(billingData)).to.be.equals(false);
            });
        });

        describe('if there is email in form and error field is not empty', () => {
            before(() => {
                billingData = {
                    form: {
                        contactInfoFields: {
                            email: {
                                htmlValue: ''
                            }
                        }
                    },
                    fieldErrors: [{ dwfrm_billing_contactInfoFields_email: 'Please enter your email id' }],
                    error: true
                };
            });
            after(() => {
                billingData = undefined;
            });
            it('should return object with error', () => {
                expect(createErrorEmailResponse(billingData)).to.be.deep.equal({
                    form: billingData.form,
                    fieldErrors: [{ dwfrm_billing_contactInfoFields_email: billingData.fieldErrors[0].dwfrm_billing_contactInfoFields_email }],
                    error: true
                });
            });
        });
    });

    describe('getBARestData', () => {
        const getBARestData = paypalHelper.__get__('getBARestData');
        let isCartFlow;
        let tokenData;
        let shipping_address = {
            line1: 'test address',
            city: 'test city',
            state: 'test state',
            postal_code: 'test postal code',
            country_code: 'US',
            recipient_name: 'Mike Test'
        };
        let basketShippingAddress = {
            getAddress1: () => 'test address',
            getCity: () => 'test city',
            getStateCode: () => 'test state',
            getPostalCode: () => 'test postal code',
            getCountryCode: () => ({
                getValue: () => 'US'
            }),
            getFullName: () => 'Mike Test'
        };

        describe('if isCartFlow is true', () => {
            before(() => {
                isCartFlow = true;
            });
            after(() => {
                isCartFlow = undefined;
            });
            it('should return object with rest data', () => {
                tokenData = {
                    path: 'v1/billing-agreements/agreement-tokens',
                    method: 'POST',
                    body: {
                        description: 'billingAgreementDescription',
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
                                immutable_shipping_address: false
                            }
                        }
                    }
                };
                expect(getBARestData(isCartFlow)).to.deep.equal(tokenData);
            });
        });

        describe('if isCartFlow is false', () => {
            before(() => {
                isCartFlow = false;
                const getBAShippingAddress = stub();
                getShippingAddress.returns(basketShippingAddress);
                getBAShippingAddress.withArgs(basketShippingAddress).returns(shipping_address);
            });
            after(() => {
                isCartFlow = undefined;
            });
            it('should return object with rest data', () => {
                tokenData = {
                    path: 'v1/billing-agreements/agreement-tokens',
                    method: 'POST',
                    body: {
                        description: 'billingAgreementDescription',
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
                                immutable_shipping_address: true,
                            }
                        },
                        shipping_address: {
                            line1: 'test address',
                            city: 'test city',
                            state: 'test state',
                            postal_code: 'test postal code',
                            country_code: 'US',
                            recipient_name: 'Mike Test'
                        }
                    }
                };
                expect(getBARestData(isCartFlow)).to.deep.equal(tokenData);
            });
        });
    });

    describe('updateCustomerPhone', () => {
        const updateCustomerPhone = paypalHelper.__get__('updateCustomerPhone');
        let billingData;
        const basket = {
            getBillingAddress: stub(),
            billingAddress: {
                phone: '4084842211'
            }
        };
        const billingAddress = {
            setPhone: stub()
        };
        basket.getBillingAddress.returns(billingAddress);
        describe('if phone is entered by user, email was not already set to basket and data form is without errors', () => {
            before(() => {
                billingData = {
                    phone: {
                        value: '6505895223'
                    }
                };
                updateCustomerPhone(basket, billingData);
            });
            after(() => {
                billingData = {};
            });
            it('should set customer`s phone to basket', () => {
                assert.calledWith(billingAddress.setPhone, '6505895223');
            });
        });

        describe('if phone is entered by user and data form is with errors', () => {
            before(() => {
                billingData = {
                    form: {
                        contactInfoFields: {
                            phone: {
                                htmlValue: '6505895223'
                            }
                        }
                    }
                };
                updateCustomerPhone(basket, billingData);
            });
            after(() => {
                billingData = {};
            });
            it('should set customer`s phone to basket', () => {
                assert.calledWith(billingAddress.setPhone, '6505895223');
            });
        });
    });
});
