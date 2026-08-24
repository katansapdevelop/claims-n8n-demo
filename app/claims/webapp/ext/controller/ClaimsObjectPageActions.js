sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        /**
         * Generated event handler.
         *
         * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
         * @param aSelectedContexts the selected contexts of the table rows.
         */
        onReviewerReject: async function(oContext, aSelectedContexts) {
            if(!this.rejectionReasonDialog){
                this.rejectionReasonDialog = await this.getInterface().loadFragment({
                    id: "rejectionReasonDialog",
                    name: "com.logicalstarconsulting.claims.ext.view.rejectionReasonDialog",
                    controller: this.extension.com.logicalstarconsulting.claims.ext.controller.OPExtend
                })
            }
            this.rejectionReasonDialog.open();
        }
    };
});
