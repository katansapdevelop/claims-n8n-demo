import cds from "@sap/cds";
const LOG = cds.log("ls.claims");
import { validateAttachments, uploadAttachmentToRepository, getAttachmentStream } from "./utils/AttachmentsUtil.cjs";
import { updateClaimsTotals, calculateQualityClaimsValuesForClaim, updateClaimStatus, claim_types, claim_statuses, claimActions, updateClaimDetailsFromERP, validateClaimBeforeSave, updateExternalClaimId, calculateQualityClaimsValuesForQualityClaim, validateBeforeSubmitForReview, validateRepBeforeSave, updateClaimDuetoTypeChange, calculateDaysFromArrival } from "./utils/ClaimsUtil.cjs";



class ClaimAppService extends cds.ApplicationService {
  async init() {
    const {
      Claims,
      Attachments,
      PalletSearch,
      ClaimPallets,
      PackHouseSearch,
      Costs,
    } = this.entities;


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

      LOG.info("Updating Claims Totals");
      await updateClaimsTotals(claims);

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


    this.on("UPDATE", "Claims", async (req, next) => {
      await updateClaimDuetoTypeChange(req);

      await next(req);
    });

    this.after("UPDATE", "Claims", async (claims) => {


      LOG.info("Updating claims data after save");
      await updateClaimsTotals(claims);
      
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
          claim.payment_deduction_doc_id === null 
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
      if (!attachments.contentType) {
        LOG.info("No attachment content was found to be created");
        LOG.info("Attachments Draft: " + JSON.stringify(attachments));
        return;
      }

      try {

        
        const filename = attachments.content.header('content-disposition').split("=")[1].replace(/"/g, '');

        const id = attachments.content.url.match(/attachments\(ID=([0-9a-fA-F-]{36})/)[1];

        let document = await uploadAttachmentToRepository(
          attachments
        );
        const documentObjectId = document.succinctProperties["cmis:objectId"];
        LOG.info(
          "Document Created in Repository with Object ID: " + documentObjectId
        );

        LOG.info(
          "Saving Object Id to Draft Attachment Table for: " + id
        );
        await cds.run(
          UPDATE(Attachments.drafts)
            .set({ objectId: documentObjectId, name: filename })
            .where({ ID: id })
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
