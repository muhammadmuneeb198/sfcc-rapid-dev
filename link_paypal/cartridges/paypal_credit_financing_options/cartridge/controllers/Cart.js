'use strict';

var page = module.superModule;
var server = require('server');
server.extend(page);

server.append('Show', function (req, res, next) {
    const basket = require('dw/order/BasketMgr').getCurrentBasket();
    if (!basket) {
        return next();
    }

    res.setViewData({
        paypalCalculatedCost: basket.totalGrossPrice
    });
    next();
});

module.exports = server.exports();
