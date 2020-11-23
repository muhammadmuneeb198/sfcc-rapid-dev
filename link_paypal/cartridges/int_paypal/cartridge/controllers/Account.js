'use strict';

var page = module.superModule;
var server = require('server');
server.extend(page);

server.append('Show', function (_, res, next) {
    const {
        billingAgreementEnabled
    } = require('../config/paypalPreferences');
    const BillingAgreementModel = require('../models/billingAgreement');
    const billingAgreementModel = new BillingAgreementModel();

    res.setViewData({
        paypal: {
            savedBA: billingAgreementModel.getBillingAgreements(),
            billingAgreementEnabled: billingAgreementEnabled
        }
    });
    next();
});

module.exports = server.exports();
