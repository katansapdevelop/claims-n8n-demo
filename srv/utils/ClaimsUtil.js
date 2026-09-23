import cds from "@sap/cds";

const LOG = cds.log("ls.claims");

export const claim_types = {
  quality: "QC",
  packaging: "PK",
  shipping: "SH",
};

export const claim_statuses = {
  NEW: 1,
  PENDING_REVIEW: 2,
  INFO_REQ: 3,
  REVIEW_APPROVED: 4,
  REVIEW_REJECTED: 5,
  SENT_TO_BREWER: 6,
  WITH_FINANCE: 7,
  COMPLETE: 8,
};

export const claimActions = {
  CREATED: 0,
  SUBMIT_REVIEW: 1,
  APPROVE_REVIEW: 2,
  REJECT_REVIEW: 3,
  REQUEST_INFO: 4,
  SEND_BREWER: 5,
  BREWER_ACCEPT: 6,
  BREWER_REJECT: 7,
  COMPLETE: 8,
};

let _claimTypes = null;
export const getClaimTypes = async () => {
  if (_claimTypes === null) {
    _claimTypes = await SELECT.from("ls.claims.ClaimType");
  }
  return _claimTypes;
};

export const getClaimTypeById = async (claimTypeId) => {
  const claimTypes = await getClaimTypes();
  return claimTypes.find((claimType) => claimType.id === claimTypeId);
};

let _erpClaims = null;

const _isDateInFuture = (date) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(date) > tomorrow;
};

const _validateQCClaimBeforeSave = async (req) => {
  const claim = req.data;
  if (claim.type_id !== claim_types.quality) {
    return;
  }

  
};

export const validateClaimBeforeSave = async (req) => {
  const claim = req.data;

  LOG.info("Validating if the claim has currency code");
  if (
    (claim.claim_currency_code === null || claim.claim_currency_code === "") &&
    claim.claim_value > 0
  ) {
    LOG.warn(
      "Currency code is mandatory for a claim with value " +
        claim.claim_value +
        " " +
        claim.claim_currency_code
    );
    req.reject(400, "Currency code is mandatory for a claim with value");
  }

  LOG.info("Validating if the claim date is set in the future");
  if (_isDateInFuture(claim.date_of_claim)) {
    LOG.warn("Claim date cannot be in the future");
    req.reject(400, "Claim date cannot be in the future");
  }

  LOG.info(
    "Validating if the claim status is complete than no more changes are accepted"
  );
  if (!req.user.is("admin")) {
    if (
      claim.status_id == claim_statuses.COMPLETE ||
      claim.status_id == claim_statuses.REVIEW_REJECTED
    ) {
      LOG.warn(
        "Claim status is " + claim.status_id + ", no more changes are accepted"
      );
      req.reject(
        400,
        "Claim status is complete or rejected, no more changes are accepted"
      );
    }
  }

  LOG.info("Validating if the claim has duplicate pallet ids in the claim");
  if (claim.pallets) {
    const palletIds = claim.pallets.map((pallet) => pallet.pallet_ID);
    const uniquePalletIds = new Set(palletIds);
    if (palletIds.length !== uniquePalletIds.size) {
      LOG.warn("Duplicate pallet ids found for claim " + claim.ID);
      req.reject(400, "Claim cannot have duplicate pallet ids");
    }
  }

  LOG.info("Run claim type specific pre-save validations");
  await _validateQCClaimBeforeSave(req);
};


export const updateClaimsTotals = async (Claim_Header) => {
  LOG.info("Calculating the total claim value including additional costs");

  let claimHeaders = Claim_Header;
  if (!Array.isArray(Claim_Header)) {
    claimHeaders = [Claim_Header];
  }

  if (claimHeaders.length === 0) {
    LOG.info("No claims found exiting routine");
    return;
  }

  LOG.info("Reading costs for all claims being read");
  const claimIds = claimHeaders.map((claim) => claim.ID);

  let readClaimCostsFromDb = false;
  let claims = null;
  if (!Object.prototype.hasOwnProperty.call(claimHeaders[0], "claim_value")) {
    readClaimCostsFromDb = true;
    claims = await SELECT.from("ls.claims.Claims")
      .columns("ID", "claim_value")
      .where({ ID: { in: claimIds } });
  }

  const costs = await SELECT.from("ls.claims.Costs")
    .columns("claim_ID", "value")
    .where({ claim_ID: { in: claimIds } });

  LOG.info("Updating costs for all claims being read");
  for (const claim of claimHeaders) {
    if (readClaimCostsFromDb === true && claims.length > 0) {
      const claimCost = claims.filter((claimCost) => claimCost.ID === claim.ID);
      claim.claim_value = Number(claimCost[0].claim_value.toFixed(2));
    }
    // Initialize the total claim value to 0 before adding individual costs
    claim.total_claim_value = 0
    
    if (claim.claim_value) {
      claim.total_claim_value = claim.claim_value;
    }

    const claimCosts = costs.filter((cost) => cost.claim_ID === claim.ID);
    for (const cost of claimCosts) {
      claim.total_claim_value += Number(cost.value);
    }
    claim.total_claim_value.toFixed(2);

    LOG.info("Updating costs for claim " + claim.ID);
    await UPDATE("ls.claims.Claims", { ID: claim.ID }).with({
      total_claim_value: claim.total_claim_value,
    });
  }
};

const _generateClaimId = async (delivery_id) => {
  LOG.info("Generating claim ID for the claim");
  LOG.info(
    "Reading the highest claims to generate claim id for delivery ID: " + delivery_id
  );
  const latestClaim = await SELECT.one.from("ls.claims.Claims").orderBy("claim_id desc");
  LOG.info("Successfully found latest claim was " + latestClaim.claim_id);

  let claimId = latestClaim.claim_id;
  claimId++;
  claimId = claimId.toString();
  LOG.info("Successfully generated Claim Id " + claimId);

  return claimId;
};

export const updateExternalClaimId = async (ClaimHeader) => {
  LOG.info("Updating claim ID for the claim");
  const claimId = await _generateClaimId(ClaimHeader.delivery_id);
  LOG.info("Updating the claim id of the claim to: " + claimId);
  await UPDATE("ls.claims.Claims", { ID: ClaimHeader.ID }).with({
    claim_id: claimId,
  });
};

export const updateClaimStatus = async (claimId, statusId, statusText, claimAction) => {
  LOG.info("Updating claims status to " + statusText);
  const response = {
    success: false,
    message: "",
  };

  const auditLogRecord = {
    claim_ID: claimId,
    claimAction_id:
      claimAction !== undefined
        ? claimAction.toString()
        : claimActions.CREATED.toString(),
    newStatus_id: statusId.toString(),
    originalStatus_id: null,
  };

  try {
    const claims = await SELECT.one
      .from("ls.claims.Claims")
      .columns((claim) => {
        claim.ID,
          claim.type((type) => {
            type.id;
          }),
          claim.status((status) => {
            status.id;
          });
      })
      .where({ ID: claimId });

    if (claims.status === null) {
      claims.status = { id: null };
    }

    auditLogRecord.originalStatus_id =
      claimAction !== undefined ? claims.status.id.toString() : null;

    LOG.info(
      "Read claim from DB with key " +
        claimId +
        " and found values: " +
        JSON.stringify(claims)
    );

    response.claimType = claims.type.id;
    let previousValidStatusCodes = _claim_status_previous;
    switch (claims.type.id) {
      case claim_types.quality:
        previousValidStatusCodes = _claim_status_previous_qc;
        break;
    }

    if (!previousValidStatusCodes[statusId].includes(claims.status.id)) {
      LOG.error(
        "Trying to set status id " +
          statusId +
          " but no matching values for current status " +
          claims.status.id +
          " for claim ID " +
          claimId
      );
      response.message =
        "It is not possible to change the status from the current status to " +
        statusText;
      return response;
    }

    LOG.info("Updating the status of the claim to: " + statusText);
    await UPDATE("ls.claims.Claims", { ID: claimId }).with({
      status_id: statusId,
    });
    LOG.info("Status updated to " + statusText);
    response.success = true;
    response.message = "Claim status updated to " + statusText;

    LOG.info(
      "Updating the audit log for the claim: " + JSON.stringify(auditLogRecord)
    );
    await INSERT.into("ls.claims.AuditLogs").entries([auditLogRecord]);
    LOG.info("Audit Log successfully added");
  } catch (e) {
    LOG.error("Errors occured reading the claim status: " + e);
    response.message = "Errors occured updating the claim";
    return response;
  }

  return response;
};

const _claim_status_previous_qc = {
  1: [null],
  2: [1, 6, 3],
  3: [2],
  4: [2],
  5: [2],
  6: [4],
  7: [6],
  8: [7],
};

const _claim_status_previous = {
  1: [null],
  2: [1, 3],
  3: [2],
  5: [2],
  7: [2],
  8: [7],
};

export const validateBeforeSubmitForReview = async (req) => {
  const claimID = req.params[0].ID;
  LOG.info("Reading claim details for claim id: " + claimID);
  const claim = await SELECT.one
    .from("ls.claims.Claims")
    .columns((claim) => {
      claim.ID,
        claim.type_id;
    })
    .where({ ID: claimID });
  LOG.info("Read claim " + JSON.stringify(claim));
};
