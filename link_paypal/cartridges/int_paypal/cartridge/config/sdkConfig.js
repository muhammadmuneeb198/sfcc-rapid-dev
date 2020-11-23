const allowedCurrencies = [
    'AUD',
    'BRL',
    'CAD',
    'CZK',
    'EUR',
    'HKD',
    'HUF',
    'INR',
    'ILS',
    'JPY',
    'MYR',
    'MXN',
    'TWD',
    'NZD',
    'NOK',
    'PHP',
    'PLN',
    'GBP',
    'RUB',
    'SGD',
    'THB',
    'USD'
];

var paypalCartButtonConfig = {
    style: {
        // height: '', value from 25 to 55
        color: 'gold', // gold, blue, silver, black, white
        shape: 'rect', // pill, rect
        layout: 'vertical',  // horizontal, vertical
        label: 'checkout', // paypal, checkout, buynow, pay, installment
        tagline: false // true, false
    }
};
var paypalBillingButtonConfig = {
    style: {
        // height: '', value from 25 to 55
        color: 'gold', // gold, blue, silver, black, white
        shape: 'rect', // pill, rect
        layout: 'vertical',  // horizontal, vertical
        label: 'paypal', // paypal, checkout, buynow, pay, installment
        tagline: false // true, false
    }
};

const disableFunds = [
    'sepa',
    'bancontact',
    'eps',
    'giropay',
    'ideal',
    'mybank',
    'p24',
    'sofort'
];

const staticImageLink = 'https://www.paypalobjects.com/webstatic/en_US/i/buttons/checkout-logo-large.png';

module.exports = {
    disableFunds: disableFunds,
    staticImageLink: staticImageLink,
    allowedCurrencies: allowedCurrencies,
    paypalBillingButtonConfig: paypalBillingButtonConfig,
    paypalCartButtonConfig: paypalCartButtonConfig
};
