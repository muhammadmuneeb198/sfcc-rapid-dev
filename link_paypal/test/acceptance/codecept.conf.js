exports.config = {
  tests: './*_test.js',
  output: './output',
  helpers: {
    WebDriver: {
      url: 'https://paypal03-tech-prtnr-na06-dw.demandware.net/s/MobileFirst/',
	  browser: 'chrome'
    }
  },
  plugins: {
    allure: {
		enabled : true
	},
	stepByStepReport: {
		enabled: false
	}
  },
  include: {
	I: './steps_file.js'
	
  },
  bootstrap: null,
  mocha: {},
  name: 'pyplec-auto'
}

/*
NOTE: base url should be specified like:
	url : 'https://paypal03-tech-prtnr-na06-dw.demandware.net/s/MobileFirst/',

*/