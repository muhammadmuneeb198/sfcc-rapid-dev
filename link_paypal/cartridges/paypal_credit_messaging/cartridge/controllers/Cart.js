'use strict';

var page = module.superModule;
var server = require('server');

const Site = require('dw/system/Site');

server.extend(page);

server.append('Show', function (req, res, next) {
    const currentSite = Site.getCurrent();
    const creditMessageAvaliable = !currentSite.getCustomPreferenceValue('PP_API_BA_Enabled') && currentSite.getCustomPreferenceValue('PP_Show_On_Cart');
    if (!creditMessageAvaliable) return next();
    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        const basket = require('dw/order/BasketMgr').getCurrentBasket();
        if (!basket) {
            return;
        }
        const { getClientId } = require('*/cartridge/scripts/paypal/paypalUtils');
        const bannerConfig = require('../config/creditMessageConfig').cartMessageConfig;
        const clientID = getClientId();
        var bannerSdkUrl = 'https://www.paypal.com/sdk/js?client-id=' + clientID + '&components=messages';

        var data = res.getViewData();
        data.paypal.sdkUrl = data.paypal.sdkUrl ? data.paypal.sdkUrl + '&components=buttons,messages' : data.paypal.sdkUrl;

        res.setViewData({
            paypalAmount: basket.totalGrossPrice.value,
            bannerSdkUrl: bannerSdkUrl,
            bannerConfig: bannerConfig,
            creditMessageAvaliable: creditMessageAvaliable
        });
    });

    return next();
});

module.exports = server.exports();
