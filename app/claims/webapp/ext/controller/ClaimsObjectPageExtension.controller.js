sap.ui.define(['sap/ui/core/mvc/ControllerExtension',"sap/ui/model/json/JSONModel"], function (ControllerExtension, JSONModel) {
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


			}
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

					/*
					//TODO Replace this logic to refresh the page with one that reloads the button state only
					// This code will run after the 2-second wait
					new Promise((resolve) => setTimeout(resolve, 2000)).then(
					  function () {
						// This is required to update the button list following a status change
						// eslint-disable-next-line no-undef
						window.location.reload();
					  }
					);
					*/
				})
				.catch((error) => {
					// Handle other types of errors
					//MessageToast.show(error.message);
					console.error("Error:", error);
				});
		},

	});
});
