import cds from "@sap/cds";
import { loadDestination } from "sap-cap-sdm-plugin/lib/util/index.js";
const LOG = cds.log("ls.claims");
import { validateAttachments, uploadAttachmentToRepository, getAttachmentStream } from "./utils/AttachmentsUtil.cjs";
import claimsUtil from "./utils/ClaimsUtil.cjs";
import { updateClaimsTotals, calculateQualityClaimsValuesForClaim, updateClaimStatus, claim_types, claim_statuses, claimActions, updateClaimDetailsFromERP, validateClaimBeforeSave, updateExternalClaimId, calculateQualityClaimsValuesForQualityClaim, convertToMarketAssistance, convertClaimAmountsToNZD, validateBeforeSubmitForReview, validateRepBeforeSave, updateClaimDuetoTypeChange, updateClaimDueToRPINChange, getWeekNumber, calculateDaysFromArrival } from "./utils/ClaimsUtil.cjs";
import { parseQueryOptionsForFiltering } from "./utils/ODataUtil.cjs";
import { onHandleReadErpRPINs, onHandleReadErpDelivery } from "./utils/DeliveriesUtil.cjs";
//import { SELECT, UPDATE } from cds.ql;


//const { default: cds } = require("@sap/cds");
//const { loadDestination } = require("sap-cap-sdm-plugin/lib/util/index");
//const LOG = cds.log("ls.claims");


/*
const {
  validateAttachments,
  uploadAttachmentToRepository,
  getAttachmentStream,
} = require("./utils/AttachmentsUtil");
*/

/*
const claimsUtil = require("./utils/ClaimsUtil");
const {
  updateClaimsTotals,
  calculateQualityClaimsValuesForClaim,
  updateClaimStatus,
  claim_types,
  claim_statuses,
  claimActions,
  updateClaimDetailsFromERP,
  validateClaimBeforeSave,
  updateExternalClaimId,
  calculateQualityClaimsValuesForQualityClaim,
  convertToMarketAssistance,
  convertClaimAmountsToNZD,
  validateBeforeSubmitForReview,
  validateRepBeforeSave,
  updateClaimDuetoTypeChange,
  updateClaimDueToRPINChange,
  getWeekNumber,
  calculateDaysFromArrival,
} = require("./utils/ClaimsUtil");

const { parseQueryOptionsForFiltering } = require("./utils/ODataUtil");

const {
  onHandleReadErpRPINs,
  onHandleReadErpDelivery,
} = require("./utils/DeliveriesUtil");
const { SELECT, UPDATE } = require("@sap/cds").ql;

*/
class ClaimAppService extends cds.ApplicationService {
  async init() {
    const {
      Claims,
      RPINSearch,
      Attachments,
      PalletSearch,
      ClaimPallets,
      PackHouseSearch,
      Costs,
    } = this.entities;
    //const erpClaims = await cds.connect.to("Z_OCP_CLAIMS_SRV");
    //const { DeliverySet } = erpClaims.entities;

    this.after("READ", [Costs, Costs.drafts], async (Costs) => {
      LOG.info("Reading Costs");
      let costClaims = null;
      if (Costs.length > 0) {
        LOG.info("Read all claim currencies from the DB for costs");
        const costIds = Costs.map((cost) => cost.ID);
        costClaims = await SELECT.from("ls.claims.Costs")
          .columns((cost) => {
            cost.ID,
              cost.claim((claim) => {
                claim.claim_currency_code;
              });
          })
          .where({ ID: { in: costIds } });
        LOG.info(
          "Successfully read " +
            costClaims.length +
            " claim currencies from the DB for costs from the DB"
        );
      }

      for (let cost of Costs) {
        cost.currency_code = null; // Default to null
        for (let claimCost of costClaims) {
          if (
            claimCost.ID === cost.ID &&
            claimCost?.claim?.claim_currency_code
          ) {
            cost.currency_code = claimCost.claim.claim_currency_code;
          }
        }
      }
    });

    this.after("CREATE", Claims, async (Claim_Header) => {
      // Set default values
      if (!Claim_Header.hasOwnProperty("HasActiveEntity")) {
        LOG.info("Defaulting the status of the claim to new");
        updateClaimStatus(Claim_Header.ID, claim_statuses.NEW, "New");
        await updateExternalClaimId(Claim_Header);
      }
    });

    this.after("CREATE", "Claims", async (claims) => {
      LOG.info("Convert Claim Amounts to NZD");
      await convertClaimAmountsToNZD(claims);

      LOG.info("Updating Claims Totals");
      await updateClaimsTotals(claims);
      await updateClaimDetailsFromERP(claims, erpClaims);

      LOG.info("Claim Type is " + claims.type_id);
      switch (claims.type_id) {
        case claim_types.quality:
          LOG.info("Creating Quality Claim Entity");
          await INSERT.into("ls.claims.QualityClaims").entries({
            claim_ID: claims.ID,
          });
          break;
        case claim_types.packaging:
          LOG.info("Creating Packaging Claim Entity");
          await INSERT.into("ls.claims.PackagingClaims").entries({
            claim_ID: claims.ID,
          });
          break;
      }
    });

    
    this.on("SAVE", "Claims", async (req, next) => {
      const claim = req.data;
      LOG.info("Updating the week number for the claim");
      if (claim.arrival_date) {
        req.data.claim_date_week_number = await getWeekNumber(
          new Date(claim.arrival_date)
        );
      }

      await next(req);
    });

    this.on("UPDATE", "Claims", async (req, next) => {
      await updateClaimDuetoTypeChange(req);
      await updateClaimDueToRPINChange(req);

      await next(req);
    });

    this.after("UPDATE", "Claims", async (claims) => {
      LOG.info("Convert Claim Amounts to NZD");
      await convertClaimAmountsToNZD(claims);

      LOG.info("Updating claims data after save");
      await updateClaimsTotals(claims);
      await updateClaimDetailsFromERP(claims, erpClaims);
    });

    this.after("READ", Claims, async (claims) => {
      LOG.info("Reading expanded claim data");
      await calculateQualityClaimsValuesForClaim(claims);

      let deliveryIds = [];
      claims.map((claim) => {
        if (claim.delivery_id) {
          deliveryIds.push(claim.delivery_id);
        }
      });

      LOG.info("Reading delivery IDs for claims");
      let deliveries = [];
      if (deliveryIds.length > 0) {
        deliveries = await SELECT.from("ls.claims.Deliveries").where({
          delivery_id: deliveryIds,
        });
      }

      claims.map((claim) => {
        const delivery = deliveries.find(
          (d) => d.delivery_id === claim.delivery_id
        );
        if (delivery) {
          claim.container_id = delivery.container_id
            ? delivery.container_id
            : null;
        }
      });

      await calculateDaysFromArrival(claims);
    });

    this.before("CREATE", "ClaimDefects.drafts", async (req) => {
      LOG.info("Validating Claim Defects Befor Create");
      const claim_id = req.data.claim_ID;

      LOG.info("Read claim draft data");
      let draftClaim = null;
      if (claim_id) {
        const draftClaims = await cds.run(
          SELECT(Claims.drafts).where({ ID: claim_id })
        );

        draftClaim = draftClaims ? draftClaims[0] : null;
      }

      if (draftClaim.primary_defect_code_id === null) {
        LOG.error("Primary Defect ID is required");
        req.error("Primary Defect ID is required before assigning defects");
      }
    });

    this.after("READ", "QualityClaims", async (claims) => {
      LOG.info("Updating expanded claim data");
      await calculateQualityClaimsValuesForQualityClaim(claims);
    });

    this.after("READ", "Claims.drafts", async (claims) => {
      LOG.info("Updating expanded claim data");
      await calculateQualityClaimsValuesForClaim(claims);
      let claimIds = [];
      let deliveryIds = [];
      claims.map((claim) => {
        claim.hideRPIN = true; // Default to hide
        claimIds.push(claim.ID);
      });

      LOG.info("Reading draft claims");
      let draftClaims = [];
      if (claimIds.length > 0) {
        draftClaims = await cds.run(
          SELECT(Claims.drafts).where({ ID: claimIds })
        );
      }

      LOG.info("Reading delivery IDs for draft claims");
      draftClaims.map((claim) => {
        if (claim.delivery_id) {
          deliveryIds.push(claim.delivery_id);
        }
      });

      let deliveries = [];
      if (deliveryIds.length > 0) {
        deliveries = await SELECT.from("ls.claims.Deliveries").where({
          delivery_id: deliveryIds,
        });
      }

      claims.map((claim) => {
        LOG.info("Updating hideRPIN property for claim " + claim.ID);
        const draftClaim = draftClaims.find((d) => d.ID === claim.ID);

        LOG.info("Found matching draft claim: " + JSON.stringify(draftClaim));

        if (draftClaim) {
          claim.hideRPIN =
            (draftClaim.type_id === claim_types.quality ||
              draftClaim.type_id === claim_types.market ||
              draftClaim.type_id === claim_types.packaging) &&
            draftClaim.delivery_id != null
              ? false
              : claim.hideRPIN;
        } else {
          claim.hideRPIN = true;
        }

        // This is a fix to update the claim specific property for container_id
        // to support auto update via a side effect as you can use a side effect to
        // navigate to an association
        LOG.info("Updating claim specific property for container_id");

        if (draftClaim) {
          const delivery = deliveries.find(
            (d) => d.delivery_id === draftClaim.delivery_id
          );
          if (delivery) {
            claim.container_id = delivery.container_id
              ? delivery.container_id
              : null;
          }
        } else {
          claim.container_id = null;
        }
      });
      await calculateDaysFromArrival(claims);
    });

    this.before("SAVE", "Claims", async (req, next) => {
      const claimId = req.data.ID;
      LOG.info("Before saving claim: " + claimId);
      await validateClaimBeforeSave(req);
    });


    // Handlers for all status change actions

    this.on("submitForReview", Claims, async (req) => {
      await validateBeforeSubmitForReview(req);

      const response = await updateClaimStatus(
        req.params[0].ID,
        claim_statuses.PENDING_REVIEW,
        "Submit for Review",
        claimActions.SUBMIT_REVIEW
      );
      const message = response.success
        ? `The claim has been submitted for review`
        : response.message;
      req.notify(message);
    });

    this.on("requestInfo", Claims, async (req) => {
      const response = await updateClaimStatus(
        req.params[0].ID,
        claim_statuses.INFO_REQ,
        "More Information Requested",
        claimActions.REQUEST_INFO
      );
      const message = response.success
        ? `An e-mail has been sent to the claimant to request further information to support the claim`
        : response.message;
      req.notify(message);
    });

    this.on("submitReviewApprove", Claims, async (req) => {
      let claimStatus = claim_statuses.WITH_FINANCE;
      if (req.params[0].ID) {
        const claim = await SELECT.one
          .from("ls.claims.Claims")
          .columns((claim) => {
            claim.ID,
              claim.type((type) => {
                type.id;
              });
          })
          .where({ ID: req.params[0].ID });

        if (claim.type.id === claim_types.quality) {
          claimStatus = claim_statuses.REVIEW_APPROVED;
        }
      }
      const response = await updateClaimStatus(
        req.params[0].ID,
        claimStatus,
        "Review Approved",
        claimActions.APPROVE_REVIEW
      );
      const message = response.success
        ? `The claim review has been approved`
        : response.message;
      req.notify(message);
    });

    this.before("submitReviewReject", Claims, async (req) => {
      const claimId = req.params[0].ID;
      LOG.info("Validating Review Reject Action for claim " + claimId);
      const rejectionReason = req.data.reason;
      const marketAssistanceConversion = req.data.convertToMarketAssistance;

      switch (rejectionReason) {
        case "IE":
          break;
        case "IS":
          break;
        default:
          LOG.error("Invalid rejection reason " + rejectionReason);
          req.error(rejectionReason + " is not a valid rejection reason");
          break;
      }

      LOG.info(
        "Convert to market assistance was found to be " +
          marketAssistanceConversion
      );
      if (marketAssistanceConversion) {
        LOG.info("Check claim type for conversion for claim " + claimId);
        const claim = await SELECT.one
          .from("ls.claims.Claims")
          .columns((claim) => {
            claim.ID,
              claim.type((type) => {
                type.id;
              });
          })
          .where({ ID: claimId });
        if (claim.type.id !== claim_types.quality) {
          LOG.error(
            "Cannot convert claim to market assistance for type" + claim.type.id
          );
          req.error(
            "Only quality claims currently support conversion to market assistance claims"
          );
        }
      }
    });

    this.on("submitReviewReject", Claims, async (req) => {
      const claimId = req.params[0].ID;
      const rejectionReason = req.data.reason;
      const marketAssistanceConversion = req.data.convertToMarketAssistance;
      const response = await updateClaimStatus(
        claimId,
        claim_statuses.REVIEW_REJECTED,
        "Review Rejected",
        claimActions.REJECT_REVIEW
      );

      LOG.info("Updating the rejection reason for claim " + claimId);
      await UPDATE("ls.claims.Claims", { ID: claimId }).with({
        RejectionReason_id: rejectionReason,
      });

      if (marketAssistanceConversion) {
        const marketAssistClaim = await convertToMarketAssistance(claimId);
        LOG.info(
          "Updating the converted claim id for claim to " + marketAssistClaim.ID
        );
        await UPDATE("ls.claims.Claims", { ID: claimId }).with({
          convertedClaim_ID: marketAssistClaim.ID,
        });
        LOG.info(
          "Successfully updated the converted claim id for claim " + claimId
        );
      }

      const message = response.success
        ? `The claim review has been rejected`
        : response.message;
      req.notify(message);
    });

    this.on("submitSendToGrower", Claims, async (req) => {
      const response = await updateClaimStatus(
        req.params[0].ID,
        claim_statuses.SENT_TO_GROWER,
        "Sent to Grower",
        claimActions.SEND_GROWER
      );
      const message = response.success
        ? `The claim has been sent to the grower for review`
        : response.message;
      req.notify(message);
    });

    this.on("submitGrowerAccepted", Claims, async (req) => {
      const response = await updateClaimStatus(
        req.params[0].ID,
        claim_statuses.WITH_FINANCE,
        "With Finance",
        claimActions.GROWER_ACCEPT
      );
      const message = response.success
        ? `The claim has been approved by the grower & is with finance to complete`
        : response.message;
      req.notify(message);
    });

    this.on("submitGrowerRejected", Claims, async (req) => {
      const response = await updateClaimStatus(
        req.params[0].ID,
        claim_statuses.PENDING_REVIEW,
        "Grower Rejected",
        claimActions.GROWER_REJECT
      );

      const message = response.success
        ? `The claim has been rejected by the grower`
        : response.message;
      req.notify(message);
    });

    this.before("submitFinanceComplete", Claims, async (req) => {
      LOG.info("Validating Finance Complete Action");

      if (req.params[0].ID) {
        const claim = await SELECT.one
          .from("ls.claims.Claims")
          .columns((claim) => {
            claim.ID,
              claim.credit_note_id,
              claim.payment_deduction_doc_id,
              claim.type_id;
          })
          .where({ ID: req.params[0].ID });
        if (
          claim.credit_note_id === null &&
          claim.payment_deduction_doc_id === null &&
          claim.type_id !== claim_types.complaint
        ) {
          LOG.error(
            "Cannot complete the claim as payment details have not been maintained: " +
              JSON.stringify(claim)
          );

          req.error(
            400,
            "Cannot complete the claim as payment details have not been maintained"
          );

          return;
        }
      }
    });

    this.on("submitFinanceComplete", Claims, async (req) => {
      const response = await updateClaimStatus(
        req.params[0].ID,
        claim_statuses.COMPLETE,
        "With Finance to Complete",
        claimActions.COMPLETE
      );
      const message = response.success
        ? `The claim is now complete`
        : response.message;
      req.notify(message);
    });

    // Handler for all actions in draft
    this.before("requestInfo", "Claims.drafts", async (req) => {
      LOG.error("Method requestInfo not allowed for records in draft");
      req.error("You cannot perform this action on a draft record");
    });

    this.on("submitForReview", "Claims.drafts", async (req) => {
      LOG.error("Method submitForReview not allowed for a record in draft");
      req.error("You cannot perform this action on a draft record");
    });

    this.on("submitForApproval", "Claims.drafts", async (req) => {
      LOG.error("Method submitForApproval not allowed for a record in draft");
      req.error("You cannot perform this action on a draft record");
    });

    this.before("UPDATE", "Attachments.drafts", async (req) => {
      LOG.info("Before Attachment Record Created");
      validateAttachments(req);
    });

    this.after("UPDATE", "Attachments.drafts", async (attachments) => {
      LOG.info("After Attachment Draft Record Updated Handling");
      if (!cds.context.query.UPDATE.data.content) {
        LOG.info("No attachment content was found to be created");
        LOG.info("Attachments Draft: " + JSON.stringify(attachments));
        return;
      }

      try {
        let document = await uploadAttachmentToRepository(
          attachments,
          cds.context.query.UPDATE.data.content
        );
        const documentObjectId = document.succinctProperties["cmis:objectId"];
        LOG.info(
          "Document Created in Repository with Object ID: " + documentObjectId
        );

        LOG.info(
          "Saving Object Id to Draft Attachment Table for: " + attachments.ID
        );
        await cds.run(
          UPDATE(Attachments.drafts)
            .set({ objectId: documentObjectId })
            .where({ ID: attachments.ID })
        );
      } catch (error) {
        LOG.error(
          "Error uploading file to the content management server: " + error
        );
        throw new Error(
          "Error uploading file to the content management server"
        );
      }
    });

    this.on("READ", Attachments.drafts, async (req, next) => {
      LOG.info("Draft Attachment Record Read");
      const baseUrl = cds.context.http.req.url.split("?")[0];
      if (!baseUrl.endsWith("/content")) {
        // skip handler if not reading attachment data
        return next(req);
      }

      try {
        if (!req.data.ID) {
          return next(req);
        }

        // Read the attachment record and get the object ID
        const attachmentRecord = await cds.run(
          SELECT.one(Attachments.drafts).where({ ID: req.data.ID })
        );

        let fileContent = await getAttachmentStream(attachmentRecord);
        return {
          content: fileContent,
          $mediaContentType: attachmentRecord.contentType,
          $mediaContentDispositionFilename: attachmentRecord.name,
        };
      } catch (error) {
        LOG.error("Error reading attachment content: " + error);
        throw new Error("Error reading attachment from content repository");
      }
    });

    this.after("READ", Attachments, async (attachments) => {
      LOG.info("Attachment Record Read");
      const baseUrl =  cds.context.http.req.url.split("?")[0];
      if (!baseUrl.endsWith("/content")) {
        // skip handler if not reading attachment data
        return;
      }

      try {
        // Read the attachment record and get the object ID
        LOG.info("Reading Object Id for attachment from DB");
        const attachmentRecord = await SELECT.one
          .from("ls.claims.Attachments")
          .columns((attachment) => {
            attachment.ID,
              attachment.objectId,
              attachment.name,
              attachment.contentType;
          })
          .where({ ID: attachments[0].ID });

        LOG.info("Reading content from document repository with Object Id ") +
          attachmentRecord.objectId;

        let fileContent = await getAttachmentStream(attachmentRecord);
        attachments[0].content = fileContent;
      } catch (error) {
        LOG.error("Error reading attachment content: " + error);
        throw new Error("Error reading attachment from content repository");
      }
    });

    this.after("UPDATE", "ClaimPallets.drafts", async (pallet) => {
      LOG.info("Claim Pallets Being Updated");

      const draftPallets = await cds.run(
        SELECT(ClaimPallets.drafts).where({ ID: pallet.ID })
      );
      const draftPallet = draftPallets[0];
      LOG.info("Successfully read draft pallet details");

      /*
      LOG.info("Reading claim details for claim id: " + draftPallet.claim_ID);
      const claim = await SELECT.one
        .from("ls.claims.Claims")
        .columns((claim) => {
          claim.ID, claim.delivery_id, claim.rpin;
        })
        .where({ ID: draftPallet.claim_ID });
      LOG.info("Successfully read claim details");
      */
      const claim = await cds.run(
        SELECT.one(Claims.drafts).where({ ID: draftPallet.claim_ID })
      );

      // If pallet ID was updated
      if (pallet.pallet_id) {
        // Read ERP Pallets for the given Pallet ID & get pack type, storage type & variety
        // Also Read ERP RPINS for the given Pallet ID/Batch Id & get pack date
        // Get the delivery ID for the Claim Id (Note this is only required as the ERP Pallets entity is currently not filterable)
        const deliveries = await erpClaims.run(
          SELECT.from(DeliverySet)
            .columns((delivery) => {
              delivery.DelToPal((pallet) => {
                pallet.pallet_id,
                  //pallet.grade,
                  pallet.size,
                  pallet.pack_type,
                  //pallet.material_id,
                  pallet.variety,
                  pallet.storage_type,
                  pallet.delivery_id;
              }),
                delivery.DelToRpin((rpin) => {
                  rpin.pallet_id,
                    rpin.delivery_id,
                    rpin.rpin,
                    rpin.id,
                    rpin.batch_id,
                    rpin.pack_date,
                    rpin.region,
                    rpin.packer_nm;
                });
            })
            .where({
              delivery_id: claim.delivery_id,
            })
        );
        LOG.info("Successfully read pallet details from ERP");
        LOG.info("Filtering out pallet records");
        // Filter out all pallets except the one matching the id we want
        const erpPallet = deliveries[0].DelToPal.filter(
          (p) => p.pallet_id === pallet.pallet_id
        )[0];
        LOG.info("Successfully filtered out pallet records");

        LOG.info(
          "Filtering out batch records and keeping the latest pack date"
        );
        let erpBatch = {
          batch_id: null,
          pack_date: null,
          region: null,
          packer_name: null,
        };
        for (let batch of deliveries[0].DelToRpin) {
          if (
            batch.pallet_id === pallet.pallet_id &&
            batch.rpin === claim.rpin
          ) {
            // If the pack date is greater than the current pack date, update the pack date
            if (
              batch.pack_date > erpBatch.pack_date ||
              erpBatch.pack_date === null
            ) {
              erpBatch = {
                batch_id: batch.batch_id,
                pack_date: batch.pack_date,
                region: batch.region,
                packer_nm: batch.packer_nm,
              };
            }
          }
        }
        LOG.info("Successfully filtered batch records");

        LOG.info("Updating Draft Pallet Record");
        await cds.run(
          UPDATE(ClaimPallets.drafts)
            .set({
              pack_type: erpPallet.pack_type,
              variety: erpPallet.variety,
              storage_type: erpPallet.storage_type,
              batch_id: erpBatch.batch_id,
              pack_date: erpBatch.pack_date,
              region: erpBatch.region,
              packer_name: erpBatch.packer_nm,
              size: erpPallet.size,
            })
            .where({ ID: pallet.ID })
        );
        LOG.info("Successfully updated pallet draft details");
      }
    });

    this.before("SAVE", "MarketRepresentative", async (req, next) => {
      const repId = req.data.ID;
      LOG.info("Before saving market rep: " + repId);
      await validateRepBeforeSave(req);
    });

    this.before("DELETE", "MarketRepresentative", async (req, next) => {
      const repId = req.data.ID;
      LOG.info("Before deleting market rep: " + repId);
      req.warn({
        code: "WRN_DELETE",
        message:
          "Deleting a market representative that has been referenced in a claim could lead to data inconsistency (i.e. missing names)",
      });
    });

    this.on("error", Claims, (err, req) => {
      LOG.info("Custom Error Handling");
      if (err.code === 403) {
        err.message = "You are not authorized to perform this action";
      }
    });

    return super.init();
  }
}

//module.exports = ClaimAppService;
export default ClaimAppService;
