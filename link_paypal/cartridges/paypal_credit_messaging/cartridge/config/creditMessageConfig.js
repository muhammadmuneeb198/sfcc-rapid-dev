const cartMessageConfig = {
    layout: 'flex', // flex, text
    styleColor: 'gray', // only for flex layout: blue, black, white, white-no-border, gray
    ratio: '8x1', // only for flex layout: 1x1, 1x4, 8x1, 20x1
    logoType: '', // only for text layout: primary, alternative, inline, none
    logoPosition: '', // only for text layout: left, right, top
    textColor: '' // only for text layout: black, white
};

const productDetailMessageConfig = {
    layout: 'text', // flex, text
    styleColor: 'blue', // only for flex layout: blue, black, white, white-no-border, gray
    ratio: '8x1', // only for flex layout: 1x1, 1x4, 8x1, 20x1
    logoType: 'alternative', // only for text layout: primary, alternative, inline, none
    logoPosition: '', // only for text layout: left, right, top
    textColor: '' // only for text layout: black, white
};

const categoryMessageConfig = {
    layout: 'flex', // flex, text
    styleColor: 'blue', // only for flex layout: blue, black, white, white-no-border, gray
    ratio: '20x1', // only for flex layout: 1x1, 1x4, 8x1, 20x1
    logoType: '', // only for text layout: primary, alternative, inline, none
    logoPosition: '', // only for text layout: left, right, top
    textColor: '' // only for text layout: black, white
};

module.exports = {
    cartMessageConfig: cartMessageConfig,
    productDetailMessageConfig: productDetailMessageConfig,
    categoryMessageConfig: categoryMessageConfig
};
