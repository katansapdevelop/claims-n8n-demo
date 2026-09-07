sap.ui.define(['sap/ui/core/mvc/ControllerExtension', "sap/ui/model/json/JSONModel", "sap/m/PDFViewer", "sap/m/MessageToast",
	"sap/suite/ui/commons/imageeditor/ImageEditor"], function (ControllerExtension, JSONModel, PDFViewer, MessageToast, ImageEditor) {
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



					this._pdfViewer = new PDFViewer("pdfViewer", {
						isTrustedSource: true,
						errorPlaceholderMessage: "Unable to load Document"
					});
					this.getView().addDependent(this._pdfViewer);
					

					this._imageViewer = new ImageEditor("imageViewer", {});
					this.getView().addDependent(this._imageViewer);


				},
				onExit: function () {
					this._revokePreviewObjectUrl();
				}
			},
			_pdfViewer: null,
			_imageViewer: null,
			_previewObjectUrl: null,
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
				switch (sAttachment.type) {
					case "application/pdf":
						try {
							debugger;
							this._pdfViewer.setSource(sAttachment.downloadUrl);
							this._pdfViewer.setTitle("Previewing " + sAttachment.fileName);
							this._pdfViewer.open();
						} catch (error) {
							MessageToast.show("Unable to preview attachment");
						}
						break;
					case "image/png":
					case "image/jpeg":
						try {
							var sImageObjectUrl = await this._getAttachmentObjectUrl(sAttachment.downloadUrl);
							this._imageViewer.setSource(sImageObjectUrl);
							this._imageViewer.setTitle("Previewing " + sAttachment.fileName);
							this._imageViewer.open();
						} catch (error) {
							MessageToast.show("Unable to preview attachment");
						}
						break;
					default:
						MessageToast.show("Preview not available for file type " + sAttachment.type);
						break;
				}

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

		


		});
	});
