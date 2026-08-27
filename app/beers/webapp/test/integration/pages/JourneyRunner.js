sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/logicalstarconsulting/claims/beers/test/integration/pages/BeersList",
	"com/logicalstarconsulting/claims/beers/test/integration/pages/BeersObjectPage"
], function (JourneyRunner, BeersList, BeersObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/logicalstarconsulting/claims/beers') + '/test/flp.html#app-preview',
        pages: {
			onTheBeersList: BeersList,
			onTheBeersObjectPage: BeersObjectPage
        },
        async: true
    });

    return runner;
});

