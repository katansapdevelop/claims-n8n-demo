sap.ui.define([
    "sap/m/MessageToast",
], function(MessageToast) {
    'use strict';

    function _getDetailsForSelectedAttachment(oSource) {
        const aSelections = Array.isArray(oSource) ? oSource : [oSource];
        const oSelection = aSelections[0];

        if (!oSelection) {
            MessageToast.show("Select an attachment to download");
            return;
        }

        const oContext = typeof oSelection.getPath === "function"
            ? oSelection
            : oSelection.getBindingContext?.();

        if (!oContext || typeof oContext.getPath !== "function") {
            MessageToast.show("Unable to resolve selected attachment");
            return;
        }

        const oAttachment = oContext.getObject?.() || {};
        const sFileName = oAttachment.name || "attachment";
        const sType = oAttachment.contentType;
        const oModel = oContext.getModel?.();
        const sContextPath = oContext.getPath();
        const sServiceUrl = oModel?.sServiceUrl.slice(0, -1) || "";
        const sDownloadUrl = sServiceUrl + sContextPath + "/content";

        return {
            fileName: sFileName,
            downloadUrl: sDownloadUrl,
            type: sType,
        };
    }

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
                    controller: this.extension.com.logicalstarconsulting.claims.ext.controller.ClaimsObjectPageExtension
                })
            }
            this.rejectionReasonDialog.open();
        },
        DownloadEvidence: async function(oEvent, oSource) {
            const aSelections = Array.isArray(oSource) ? oSource : [oSource];
            const oSelection = aSelections[0];

            if (!oSelection) {
                MessageToast.show("Select an attachment to download");
                return;
            }

            const oContext = typeof oSelection.getPath === "function"
                ? oSelection
                : oSelection.getBindingContext?.();

            if (!oContext || typeof oContext.getPath !== "function") {
                MessageToast.show("Unable to resolve selected attachment");
                return;
            }

            const oAttachment = oContext.getObject?.() || {};
            const sFileName = oAttachment.name || "attachment";
            const oModel = oContext.getModel?.();
            const sContextPath = oContext.getPath();
            const sServiceUrl = oModel?.sServiceUrl.slice(0, -1) || "";
            const sDownloadUrl = sServiceUrl + sContextPath + "/content";

            try {
                const oResponse = await fetch(sDownloadUrl, {
                    method: "GET",
                    credentials: "include"
                });

                if (!oResponse.ok) {
                    throw new Error("Download failed with status " + oResponse.status);
                }

                const oBlob = await oResponse.blob();
                const sBlobUrl = window.URL.createObjectURL(oBlob);
                const oLink = document.createElement("a");
                oLink.href = sBlobUrl;
                oLink.download = sFileName;
                document.body.appendChild(oLink);
                oLink.click();
                oLink.remove();
                window.URL.revokeObjectURL(sBlobUrl);
            } catch (error) {
                MessageToast.show("Unable to download attachment");
            }
        }

    };
});
