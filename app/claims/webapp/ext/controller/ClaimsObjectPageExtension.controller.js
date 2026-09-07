sap.ui.define(['sap/ui/core/mvc/ControllerExtension', "sap/ui/model/json/JSONModel", "sap/m/MessageToast", "sap/m/Dialog", "sap/m/Button", "sap/ui/core/HTML",
	"sap/suite/ui/commons/imageeditor/ImageEditor"], function (ControllerExtension, JSONModel, MessageToast, Dialog, Button, HTML, ImageEditor) {
	'use strict';

	return ControllerExtension.extend('com.logicalstarconsulting.claims.ext.controller.ClaimsObjectPageExtension', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf com.logicalstarconsulting.claims.ext.controller.ClaimsObjectPageExtension
			 */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();

				// JSON model for claim application local state data
				var claimAppModelJSON = {
					SelectedRejectionReason: ""
				};
				var claimAppModel = new JSONModel(claimAppModelJSON);
				this.getView().setModel(claimAppModel, "claimAppModel");

				// Evidence Preview using HTML control
				this._evidencePreviewHtml = new HTML("evidencePreviewHtml", {
					content: ""
				});

				this._evidencePreviewDialog = new Dialog("evidencePreviewDialog", {
					contentWidth: "80vw",
					contentHeight: "80vh",
					horizontalScrolling: false,
					verticalScrolling: false,
					content: [this._evidencePreviewHtml],
					endButton: new Button({
						text: "Close",
						press: function () {
							this._evidencePreviewDialog.close();
						}.bind(this)
					})
				});
				this.getView().addDependent(this._evidencePreviewDialog);

			},
			onExit: function () {
				this._revokePreviewObjectUrl();
				if (this._evidencePreviewDialog) {
					this._evidencePreviewDialog.destroy();
					this._evidencePreviewDialog = null;
				}
				this._evidencePreviewHtml = null;
			}
		},
		_evidencePreviewDialog: null,
		_evidencePreviewHtml: null,
		_previewObjectUrl: null,
		_supportedPreviewTypes: {
			"application/pdf": true,
			"image/png": true,
			"image/jpeg": true,
			"image/jpg": true
		},
		closeDialog: function (closeBtn) {
			closeBtn.getSource().getParent().close();
		},

		submitRejectionReason: function (oEvent) {
			// Get rejection reason
			const claimAppData = this.getView()
				.getModel("claimAppModel")
				.getData();

			let oContext = this.getInterface().getView().getBindingContext();
			// Set the action parameters
			const actionParameters = [
				{
					name: "reason",
					value: claimAppData.SelectedRejectionReason,
				},
			];

			// Get Handle to edit flow
			let editFlow = this.getView().getController().editFlow;

			// Call the action
			editFlow
				.invokeAction("ClaimAppService.submitReviewReject", {
					parameterValues: actionParameters,
					contexts: oContext,
					skipParameterDialog: true,
				})
				.then(function (result) {
					oEvent.getSource().getParent().close();
					console.log("Action invoked successfully " + result.toString());
				})
				.catch((error) => {
					// Handle other types of errors
					//MessageToast.show(error.message);
					console.error("Error:", error);
				});
		},

		onPreviewEvidence: async function (oEvent, oSource) {
			var sAttachment = this._getDetailsForSelectedAttachment(oSource);
			if (!sAttachment) {
				return;
			}

			if (!this._supportedPreviewTypes[sAttachment.type]) {
				MessageToast.show("Preview not available for file type " + sAttachment.type);
				return;
			}

			try {
				var sObjectUrl = await this._getAttachmentObjectUrl(sAttachment.downloadUrl);
				this._showEvidencePreview(sObjectUrl, sAttachment.fileName);
			} catch (error) {
				MessageToast.show("Unable to preview attachment");
				console.error("Preview error:", error);
			}
		},

		_showEvidencePreview: function (sObjectUrl, sFileName) {
			const sSafeUrl = (sObjectUrl || "")
				.replace(/&/g, "&amp;")
				.replace(/\"/g, "&quot;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");

			this._evidencePreviewHtml.setContent(
				'<embed title="Evidence Preview" src="' +
					sSafeUrl +
					'" type="application/pdf" style="width:100%;height:100%;border:0;" />'
			);
			this._evidencePreviewDialog.setTitle("Previewing " + sFileName);
			this._evidencePreviewDialog.open();
		},

		_getDetailsForSelectedAttachment: function (oSource) {
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
		},

		_getAttachmentObjectUrl: async function (sDownloadUrl) {
			const response = await fetch(sDownloadUrl, {
				method: "GET",
				credentials: "include"
			});

			if (!response.ok) {
				throw new Error("Download failed with status " + response.status);
			}

			const blob = await response.blob();
			const objectUrl = window.URL.createObjectURL(blob);
			this._previewObjectUrl = objectUrl;
			return objectUrl;
		},

		_revokePreviewObjectUrl: function () {
			if (this._previewObjectUrl) {
				window.URL.revokeObjectURL(this._previewObjectUrl);
				this._previewObjectUrl = null;
			}
		}
	});
});
