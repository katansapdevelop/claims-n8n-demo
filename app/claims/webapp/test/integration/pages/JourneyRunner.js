sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/logicalstarconsulting/claims/test/integration/pages/ClaimsList",
	"com/logicalstarconsulting/claims/test/integration/pages/ClaimsObjectPage"
], function (JourneyRunner, ClaimsList, ClaimsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/logicalstarconsulting/claims') + '/test/flp.html#app-preview',
        pages: {
			onTheClaimsList: ClaimsList,
			onTheClaimsObjectPage: ClaimsObjectPage
        },
        async: true
    });

    return runner;
});

