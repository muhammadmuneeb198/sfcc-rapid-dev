"use strict";

// node modules
var chai = require("chai");
var assert = chai.assert;
var chaiSubset = require("chai-subset");
chai.use(chaiSubset);
var proxyquire = require("proxyquire")
    .noCallThru()
    .noPreserveCache();

var ArrayList = require("../../../mocks/dw.util.Collection");

// Mock service data models
var createTransactionModelMock = require("../../../helpers/taxcalculationHelper");
var addressValidationInfoMock = require("../../../helpers/addressvalidatioHelper")
    .addressValidationModelMock;
var commitTransactionModelMock = require("../../../helpers/committransactionHelper");
var voidTransactionModelMock = require("../../../helpers/voidtransactionHelper");
var invalidTaxResponseMock = require("../../../helpers/taxcalculationHelper")
    .taxationResponseInvalidAddress;

// Mock service responses
var createTransactionResponseMock = require("../../../helpers/taxcalculationHelper")
    .taxationresponseMock;
var addressValidationResponseMock = require("../../../helpers/addressvalidatioHelper")
    .addressValidationResponseMock;
var commmitTransactionResponseMock = require("../../../helpers/committransactionHelper")
    .commitTransactionResponseMock;
var voidTransactionResponseMock = require("../../../helpers/voidtransactionHelper")
    .voidTransactionResponseMock;

global.empty = function (variable) {
    var isEmpty = true;
    if (variable) {
        isEmpty = false;
    }
    return isEmpty;
};

global.customer = {
    profile: {
        customerNo: '12321'
    },
    authenticated: {

    }
};

global.session = {
    privacy: {
        sitesource: ""
    }
};

var LocalServiceRegistry = {
    createService: function (serviceName, config) {
        return {
            getConfiguration: function () {
                return {
                    getCredential: function () {
                        return {
                            getURL: function () {
                                return "sandbox";
                            },
                            getUser: function () {},
                            getPassword: function () {}
                        };
                    }
                };
            },
            addHeader: function (key, val) {},
            setURL: function (url) {},
            setRequestMethod: function (method) {},
            call: function () {
                return {
                    status: "OK",
                    object: JSON.stringify({
                        value: ["@nextLink", "b", "c"],
                        status: "OK"
                    })
                };
            }
        };
    }
};

var murmurhash = {
    hashBytes: function (a, b, c) {
        return "hash";
    }
};

var str = "";

// AvaTax service client mock
var avaTaxClient = {
    voidTransaction: function (
        companyCode,
        transactionCode,
        voidTransactionModel
    ) {
        if (str == 'pass') {
            return voidTransactionResponseMock;
        } else if (str == 'error') {
            return {
                statusCode: 'ERROR',
                error: 'error',
                message: 'error message'
            };
        } else if (str == 'errorMessage') {
            return {
                statusCode: 'ERROR',
                errorMessage: 'error message'
            };
        }
    },
    commitTransaction: function (
        companyCode,
        transactionCode,
        commitTransactionModel,
        documentType
    ) {
        if (str == 'pass') {
            return commmitTransactionResponseMock;
        } else if (str == 'error') {
            return {
                statusCode: 'ERROR',
                error: 'error',
                message: 'error message'
            };
        } else if (str == 'errorMessage') {
            return {
                statusCode: 'ERROR',
                errorMessage: 'error message'
            };
        }
    },
    resolveAddressPost: function (addressValidationInfo) {
        return addressValidationResponseMock;
    },
    createTransaction: function (createTransactionModel, include) {
        if (str == 'pass') {
            return createTransactionResponseMock;
        } else if (str == 'error') {
            return {
                statusCode: 'ERROR',
                error: 'error',
                message: 'error message'
            };
        } else if (str == 'errorMessage') {
            return {
                statusCode: 'ERROR',
                errorMessage: 'error message'
            };
        }
    },
    getAuthInfo: function () {
        return {};
    },
    testConnection: function () {
        if (str == "error") {
            return {
                statusCode: "ERROR",
                error: 'error',
                message: "error message"
            };
        } else if (str == "message") {
            return {
                statusCode: "ERROR",
                message: "Error"
            };
        } else if (str == "errorMessage") {
            return {
                statusCode: "ERROR",
                errorMessage: "errorMessage"
            };
        } else if (str == "pass") {
            return {};
        }
    },
    leLog: function (jsonLog) {
        if (str = 'pass') {
            return {
                success: null
            };
        } else {
            return {
                success: false
            };
        }
    }
};


var mockOptions = [{
        optionId: 'option 1',
        selectedValueId: '123',
        shipment: {
            ID: ''
        },
        proratedPrice: {
            value: 10
        }
    },
    {
        optionId: 'option 2',
        selectedValueId: '1234',
        shipment: {
            ID: ''
        },
        proratedPrice: {
            value: 9
        }
    }
];

var availabilityModelMock = {
    inventoryRecord: {
        ATS: {
            value: 3
        }
    }
};
var shippingAddressValid = {
    addressLines: ['900 winslow way e'],
    administrativeArea: '',
    city: 'Bainbridge Island',
    country: 'United States',
    countryCode: 'us',
    emailAddress: 'dev@avalara.com',
    familyName: 'Doe',
    givenName: 'John',
    locality: '',
    phoneNumber: '3333333333',
    stateCode: 'WA',
    postalCode: '98110',
    subAdministrativeArea: '',
    subLocality: ''
};

var shippingAddressInvalid = {
    addressLines: ['fake street'],
    administrativeArea: '',
    city: 'fake city',
    country: 'United States',
    countryCode: 'us',
    emailAddress: 'dev@avalara.com',
    familyName: 'Doe',
    givenName: 'John',
    locality: '',
    phoneNumber: '3333333333',
    stateCode: 'fake',
    postalCode: '12345',
    subAdministrativeArea: '',
    subLocality: ''
};

var productLineItemMock_core = new ArrayList([{
        UUID: '12345',
        productID: '701643465309M',
        getProduct: function () {
            return this;
        },
        proratedPrice: {
            price: 100
        },
        shipment: {
            shippingAddress: {
                addressLines: ['900 winslow way e'],
                administrativeArea: '',
                city: 'Bainbridge Island',
                country: 'United States',
                countryCode: {
                    getDisplayValue: function () {
                        return 'us';
                    }
                },
                emailAddress: 'dev@avalara.com',
                familyName: 'Doe',
                givenName: 'John',
                locality: '',
                phoneNumber: '3333333333',
                stateCode: 'WA',
                postalCode: '98110',
                subAdministrativeArea: '',
                subLocality: ''
            }
        },
        quantity: {
            value: 1
        },
        taxClassID: 'P0000000',
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        adjustedPrice: 100,
        product: {
            availabilityModel: availabilityModelMock,
            UPC: '',
            shortDescription: {
                source: ''
            }
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        shippingLineItem: {
            surcharge: true,
            shipment: {
                ID: 'qw'
            },
            adjustedPrice: {
                value: 2
            }
        },
        productName: function () {
            return 'product name';
        }
    },
    {
        UUID: '54321',
        productID: '701643465410M',
        getProduct: function () {
            return this;
        },
        proratedPrice: {
            price: 140
        },
        shipment: {
            shippingAddress: {
                addressLines: ['900 winslow way e'],
                administrativeArea: '',
                city: 'Bainbridge Island',
                country: 'United States',
                countryCode: {
                    getDisplayValue: function () {
                        return 'us';
                    }
                },
                emailAddress: 'dev@avalara.com',
                familyName: 'Doe',
                givenName: 'John',
                locality: '',
                phoneNumber: '3333333333',
                stateCode: 'WA',
                postalCode: '98110',
                subAdministrativeArea: '',
                subLocality: ''
            }
        },
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        adjustedPrice: 140,
        product: {
            availabilityModel: availabilityModelMock,
            UPC: '',
            shortDescription: {
                source: ''
            }
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        shippingLineItem: {
            surcharge: true,
            shipment: {
                ID: 'qw'
            },
            adjustedPrice: {
                value: 2
            }
        },
        productName: function () {
            return 'product name';
        }
    },
    {
        UUID: '989766',
        productID: 'STANDARD_SHIPPING',
        getProduct: function () {
            return this;
        },
        proratedPrice: {
            price: 15.99
        },
        shipment: {
            shippingAddress: {
                addressLines: ['900 winslow way e'],
                administrativeArea: '',
                city: 'Bainbridge Island',
                country: 'United States',
                countryCode: {
                    getDisplayValue: function () {
                        return 'us';
                    }
                },
                emailAddress: 'dev@avalara.com',
                familyName: 'Doe',
                givenName: 'John',
                locality: '',
                phoneNumber: '3333333333',
                stateCode: 'WA',
                postalCode: '98110',
                subAdministrativeArea: '',
                subLocality: ''
            }
        },
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        adjustedPrice: 15.99,
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        shippingLineItem: {
            surcharge: true,
            shipment: {
                ID: 'qw'
            },
            adjustedPrice: {
                value: 2
            }
        },
        product: {
            UPC: '',
            shortDescription: {
                source: ''
            }
        },
        productName: function () {
            return 'product name';
        }
    }
]);

var productLineItemMock_sli = new ArrayList([{
        UUID: '1232222145',
        productID: '701643465309M',
        getProduct: function () {
            return this;
        },
        proratedPrice: {
            price: 100
        },
        shipment: {
            shippingAddress: {
                addressLines: ['900 winslow way e'],
                administrativeArea: '',
                city: 'Bainbridge Island',
                country: 'United States',
                countryCode: {
                    getDisplayValue: function () {
                        return 'us';
                    }
                },
                emailAddress: 'dev@avalara.com',
                familyName: 'Doe',
                givenName: 'John',
                locality: '',
                phoneNumber: '3333333333',
                stateCode: 'WA',
                postalCode: '98110',
                subAdministrativeArea: '',
                subLocality: ''
            }
        },
        quantity: {
            value: 1
        },
        taxClassID: 'P0000000',
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        adjustedPrice: 100,
        product: {
            availabilityModel: availabilityModelMock,
            UPC: '',
            shortDescription: {
                source: ''
            }
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        shippingLineItem: {
            surcharge: true,
            shipment: {
                ID: 'qw'
            },
            adjustedPrice: {
                value: 2
            }
        },
        productName: function () {
            return 'product name';
        }
    },
    {
        UUID: '5432222221',
        productID: '701643465410M',
        getProduct: function () {
            return this;
        },
        proratedPrice: {
            price: 140
        },
        shipment: {
            shippingAddress: {
                addressLines: ['900 winslow way e'],
                administrativeArea: '',
                city: 'Bainbridge Island',
                country: 'United States',
                countryCode: {
                    getDisplayValue: function () {
                        return 'us';
                    }
                },
                emailAddress: 'dev@avalara.com',
                familyName: 'Doe',
                givenName: 'John',
                locality: '',
                phoneNumber: '3333333333',
                stateCode: 'WA',
                postalCode: '98110',
                subAdministrativeArea: '',
                subLocality: ''
            }
        },
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        adjustedPrice: 140,
        product: {
            availabilityModel: availabilityModelMock,
            UPC: '',
            shortDescription: {
                source: ''
            }
        },
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        shippingLineItem: {
            surcharge: true,
            shipment: {
                ID: 'qw'
            },
            adjustedPrice: {
                value: 2
            }
        },
        productName: function () {
            return 'product name';
        }
    },
    {
        UUID: '9897122266',
        productID: 'STANDARD_SHIPPING',
        getProduct: function () {
            return this;
        },
        proratedPrice: {
            price: 15.99
        },
        shipment: {
            shippingAddress: {
                addressLines: ['900 winslow way e'],
                administrativeArea: '',
                city: 'Bainbridge Island',
                country: 'United States',
                countryCode: {
                    getDisplayValue: function () {
                        return 'us';
                    }
                },
                emailAddress: 'dev@avalara.com',
                familyName: 'Doe',
                givenName: 'John',
                locality: '',
                phoneNumber: '3333333333',
                stateCode: 'WA',
                postalCode: '98110',
                subAdministrativeArea: '',
                subLocality: ''
            }
        },
        quantity: {
            value: 1
        },
        setQuantityValue: function () {
            return;
        },
        quantityValue: 1,
        adjustedPrice: 15.99,
        optionProductLineItems: new ArrayList(mockOptions),
        bundledProductLineItems: new ArrayList([]),
        shippingLineItem: {
            surcharge: true,
            shipment: {
                ID: 'qw'
            },
            adjustedPrice: {
                value: 2
            }
        },
        product: {
            UPC: '',
            shortDescription: {
                source: ''
            }
        },
        productName: function () {
            return 'product name';
        }
    }
]);

var shipments = [{
    shippingMethod: {
        ID: '005'
    },
    shippingAddress: {
        addressLines: ['900 winslow way e'],
        administrativeArea: '',
        city: 'Bainbridge Island',
        country: 'United States',
        countryCode: {
            getDisplayValue: function () {
                return 'us';
            }
        },
        emailAddress: 'dev@avalara.com',
        familyName: 'Doe',
        givenName: 'John',
        locality: '',
        phoneNumber: '3333333333',
        stateCode: 'WA',
        postalCode: '98110',
        subAdministrativeArea: '',
        subLocality: ''
    },
    shippingLineItems: new ArrayList(productLineItemMock_sli)

}];

var createApiBasket = function () {
    var basket = {
        allProductLineItems: productLineItemMock_core,
        defaultShipment: {
            shipments: shipments,
            shippingAddress: shippingAddressValid
        },
        custom: {
            taxDetail: {}
        }
    };
    basket.getAllProductLineItems = function () {
        return basket.allProductLineItems;
    };
    basket.productLineItems = basket.allProductLineItems;
    // basket.shipments = new ArrayList(shipments);
    basket.shipments = new ArrayList();
    basket.giftCertificateLineItems = new ArrayList([{
        UUID: '1856fsfs2',
        giftCertificateID: '123456325a',
        shipment: shipments[0],
        getPriceValue: function () {
            return 12.00;
        },
        getLineItemText: function () {
            return 'line item text';
        }
    }]);
    basket.getAllLineItems = function () {
        var allLineItems = productLineItemMock_core;
        productLineItemMock_core.addAll(productLineItemMock_sli);

        return allLineItems;
    }
    basket.allLineItems = basket.getAllLineItems();
    basket.getPriceAdjustments = function () {
        return new ArrayList([new require('../../../mocks/dw/order/PriceAdjustment')()]);
    }
    basket.shippingPriceAdjustments = new ArrayList([new require('../../../mocks/dw/order/PriceAdjustment')()]);
    return basket;
};

var avaTax = proxyquire(
    "../../../../cartridges/int_avatax_sfra/cartridge/scripts/avaTax.js", {
        "dw/system": require("../../../mocks/dw/system"),
        "dw/system/Status": require("../../../mocks/dw/system/Status"),
        "dw/order": require("../../../mocks/dw/order"),
        "dw/util": require("../../../mocks/dw/util"),
        "dw/value": require("../../../mocks/dw/value"),
        "dw/system/Logger": require("../../../mocks/dw/system/Logger"),
        "dw/system/Site": require("../../../mocks/dw/system/Site"),
        'dw/util/SortedMap': require('../../../mocks/dw/util/SortedMap'),
        'dw/util/Decimal': require('../../../mocks/dw/util/Decimal'),
        "*/cartridge/scripts/avaTaxClient": avaTaxClient,
        "*/cartridge/models/addressValidationInfo": addressValidationInfoMock,
        "*/cartridge/models/commitTransactionModel": commitTransactionModelMock,
        "*/cartridge/models/createTransactionModel": createTransactionModelMock,
        "*/cartridge/models/voidTransactionModel": voidTransactionModelMock,
        "./murmurhash": murmurhash
    }
);

describe("Avatax features", function () {

    describe("Address validation", function () {
        it("should validate shipping address successfully", function () {
            var res = avaTax.validateShippingAddress({
                countryCode: {
                    value: 'us'
                }
            });
            assert.isAtLeast(res.validatedAddresses.length, 1);
        });

        it("should fail validating address in AvaTax with service failure", function () {
            str = "error";
            var res = avaTax.validateShippingAddress({
                countryCode: 'val'
            });
            assert.equal(res.status, 1);
        });

        it("should fail validating address in AvaTax with error message", function () {
            str = "errorMessage";
            var res = avaTax.validateShippingAddress({
                countryCode: {
                    value: 'val'
                }
            });
            assert.equal(res.status, 1);
        });

        it("should log an error message and return if address data is improper", function () {
            str = "errorMessage";
            var res = avaTax.validateShippingAddress({
                countryCode: {
                    values: 'val'
                }
            });
            assert.equal(res.status, 1);
        });
    });

    describe("Tax calculation", function () {
        it("should calculate taxes on Basket with valid shipping address", function () {
            // str = "pass";
            var basket = createApiBasket();
            var res = avaTax.calculateTax(basket);
            assert.isNotNull(res);
        });

        it("should calculate taxes on Basket with billing address if shipping address unavailable", function () {
            var basket = createApiBasket();

            basket.billingAddress = {
                addressLines: ['900 winslow way e'],
                administrativeArea: '',
                city: 'Bainbridge Island',
                country: 'United States',
                countryCode: {
                    getDisplayValue: function () {
                        return 'us';
                    }
                },
                emailAddress: 'dev@avalara.com',
                familyName: 'Doe',
                givenName: 'John',
                locality: '',
                phoneNumber: '3333333333',
                stateCode: 'WA',
                postalCode: '98110',
                subAdministrativeArea: '',
                subLocality: ''
            };
            var res = avaTax.calculateTax(basket, 123);
            assert.isNotNull(res);
        });

        it("should calculate taxes on products with default tax codes", function () {
            str = "error";
            var basket = createApiBasket();
            var res = avaTax.calculateTax(basket, 123);
            assert.isNotNull(res);
        });
    });
});