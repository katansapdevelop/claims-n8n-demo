sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/logicalstarconsulting/claims/deliveries/test/integration/pages/DeliveriesList",
	"com/logicalstarconsulting/claims/deliveries/test/integration/pages/DeliveriesObjectPage"
], function (JourneyRunner, DeliveriesList, DeliveriesObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/logicalstarconsulting/claims/deliveries') + '/test/flp.html#app-preview',
        pages: {
			onTheDeliveriesList: DeliveriesList,
			onTheDeliveriesObjectPage: DeliveriesObjectPage
        },
        async: true
    });

    return runner;
});

