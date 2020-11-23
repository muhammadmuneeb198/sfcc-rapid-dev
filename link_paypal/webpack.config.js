'use strict';

require('shelljs/make');
var path = require('path');

module.exports = [{
    mode: 'production',
    name: 'js',
    entry: {
        'int_paypal_cart.min': `${__dirname}/cartridges/int_paypal/cartridge/client/default/js/cart/cart.js`,
        'int_paypal_billing.min': `${__dirname}/cartridges/int_paypal/cartridge/client/default/js/billing/billing.js`
    },
    output: {
        path: path.resolve('./cartridges/int_paypal/cartridge/static/default/js'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            [
                                '@babel/preset-env',
                                {
                                    targets: {
                                        chrome: '53',
                                        firefox: '49',
                                        edge: '38',
                                        ie: '11',
                                        safari: '10'
                                    }
                                }
                            ]
                        ],
                        plugins: [
                            '@babel/plugin-proposal-object-rest-spread',
                            '@babel/plugin-transform-destructuring']
                    }
                }
            }
        ]
    }
}];
