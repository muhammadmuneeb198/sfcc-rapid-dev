// const { paypalPreferencesPath } = require('./path');
// const proxyquire = require('proxyquire').noCallThru();
// const { expect } = require('chai');
// const { stub, assert } = require('sinon');

// require('dw-api-mock/demandware-globals');
// require('babel-register')({
//     plugins: ['babel-plugin-rewire']
// });

// const emptyFunction = () => { };

// const current = {
//     getCustomPreferenceValue: () => (
//         { getValue: emptyFunction }
//     )
// };

// const paypalPreferences = proxyquire(paypalPreferencesPath, {
//     'dw/system/Site': {
//         current
//     },
//     '../scripts/paypal/configuration/paypalButtonConfigs': {
//         paypalButtonConfigs: {}
//     },
//     '../scripts/paypal/paypalUtils': {
//         createSDKUrl: () => { }
//     }
// });

// describe('paypalPreferences file', () => {
//     describe.skip('getPaypalPaymentMethodId', () => {
//         const getPaypalPaymentMethodId = paypalPreferences.__get__('getPaypalPaymentMethodId');
//         var a = paypalPreferences.__get__('allowedProcessorsIds')
//         let activePaymentMethods = [];
//         before(() => {
//             // Array.some = function (a, b) {
//             //     return Array.prototype.some.call(a, b);
//             // }
//             stub(dw.order.PaymentMgr, 'getActivePaymentMethods');
//             dw.order.PaymentMgr.getActivePaymentMethods.returns(activePaymentMethods)
//         });
//         describe('if payment method doesn`t exist', () => {
//             before(() => {
//                 activePaymentMethods = [];
//             });
//             it('should return undefined', () => {
//                 expect(getPaypalPaymentMethodId()).to.be.undefined;
//             });
//         });

//         describe('if PAYPAL is active payment method', () => {
//             before(() => {
//                 activePaymentMethods = [{
//                     paymentProcessor: {
//                         ID: 'PAYPAL'
//                     },
//                     ID: 'PayPal'
//                 }];
//             });
//             it('should return PayPal as payment method id', () => {
//                 expect(getPaypalPaymentMethodId()).to.be.equals('PayPal')
//             });
//         });
//     });
// });
