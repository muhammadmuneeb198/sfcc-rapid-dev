'use strict';

var page = module.superModule;
var server = require('server');

const Site = require('dw/system/Site');

server.extend(page);

server.append('Show', function (req, res, next) {
    const currentSite = Site.getCurrent();
    const creditMessageAvaliable = !currentSite.getCustomPreferenceValue('PP_API_BA_Enabled') && currentSite.getCustomPreferenceValue('PP_Show_On_PDP');
    if (creditMessageAvaliable) {
        const { getClientId } = require('*/cartridge/scripts/paypal/paypalUtils');
        const bannerConfig = require('../config/creditMessageConfig').productDetailMessageConfig;
        const clientID = getClientId();
        var bannerSdkUrl = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&components=messages';

        res.setViewData({
            paypal: {
                bannerSdkUrl: bannerSdkUrl,
                bannerConfig: bannerConfig
            },
            creditMessageAvaliable: creditMessageAvaliable
        });
    }

    next();
});

module.exports = server.exports();
