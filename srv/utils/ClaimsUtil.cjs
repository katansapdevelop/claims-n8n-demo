const { getValidConversionRateByCurrency } = require("./ConfigUtil.cjs");
const LOG = cds.log("ls.claims");

const { uuid } = cds.utils;

const claim_types = {
  quality: "QC",
  packaging: "PK",
  shipping: "SH",
};

//TODO Replace this with the object based one below
const claim_statuses = {
  NEW: 1,
  PENDING_REVIEW: 2,
  INFO_REQ: 3,
  REVIEW_APPROVED: 4,
  REVIEW_REJECTED: 5,
  SENT_TO_GROWER: 6,
  WITH_FINANCE: 7,
  COMPLETE: 8,
};

const claimActions = {
  CREATED: 0,
  SUBMIT_REVIEW: 1,
  APPROVE_REVIEW: 2,
  REJECT_REVIEW: 3,
  REQUEST_INFO: 4,
  SEND_GROWER: 5,
  GROWER_ACCEPT: 6,
  GROWER_REJECT: 7,
  COMPLETE: 8,
};

let _claimTypes = null;
getClaimTypes = async () => {
  if (_claimTypes === null) {
    _claimTypes = await SELECT.from("ls.claims.ClaimType");
  }
  return _claimTypes;
};

getClaimTypeById = async (claimTypeId) => {
  const claimTypes = await getClaimTypes();
  const claim = claimTypes.find((claimType) => claimType.id === claimTypeId);
  return claim;
};

let _erpClaims = null;

/**
 * Initializes or retrieves the existing ERP Claims Service instance.
 *
 * This method checks if an instance of the ERP Claims Service already exists. If it does, it returns the existing instance.
 * Otherwise, it creates a new instance of the ERP Claims Service, initializes it with necessary configurations, and returns it.
 * This ensures a single instance is used throughout the application, following the singleton pattern.
 *
 * @returns {ERPClaimsService} The ERP Claims Service instance.
 */
const _getERPClaimsService = async () => {
  if (_erpClaims === null)
    _erpClaims = await cds.connect.to("Z_OCP_CLAIMS_SRV");
  return _erpClaims;
};

/**
 * This method checks if a given date is in the future.
 *
 * @param {Date} date - The date to check.
 * @returns {boolean} Returns true if the date is in the future, false otherwise.
 */
_isDateInFuture = (date) => {
  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(date) > tomorrow;
};

const validateRepBeforeSave = async (req) => {
  const rep = req.data;

  const dbRep = await SELECT.one
    .from("ls.claims.MarketRep")
    .where({ email: rep.email });
  if (dbRep && dbRep.ID !== rep.ID) {
    LOG.warn("Email address already exists for another representative");
    req.reject(400, "Email address already exists for another representative");
  }

  if (
    (rep.firstName === null || rep.firstName === "") &&
    (rep.lastName === null || rep.lastName === "")
  ) {
    LOG.warn("A First Name or a Last Name is required for a Representative");
    req.reject(
      400,
      "A First Name or a Last Name is required for a Representative"
    );
  }
};

/**
 * This method validates a QC (Quality Control) claim before it is saved.
 *
 * @param {Object} req - The request object containing the QC claim data.
 * @throws {Error} If the QC claim does not meet the above conditions, an error is thrown with a 400 status code.
 * @returns {undefined} This function does not return a value. It either completes successfully or throws an error.
 */
const _validateQCClaimBeforeSave = async (req) => {
  const claim = req.data;
  if (claim.type_id !== claim_types.quality) {
    return;
  }

  if (claim?.qualityClaim?.qc_inspection_date) {
    if (_isDateInFuture(claim.qualityClaim.qc_inspection_date)) {
      LOG.warn("Quality Claim Inspection Date cannot be in the future");
      req.reject(400, "Quality Claim Inspection Date cannot be in the future");
    }
  }

  if (!claim.primary_defect_code_id) {
    LOG.warn("Primary Defect Code is mandatory for a Quality Claim");
    req.reject(400, "Primary Defect Code is mandatory for a Quality Claim");
  }
};

/**
 * Validates a claim before creating/updating it
 *
 * @param {Object} req - The request object containing the claim data.
 * @throws {Error} If the claim is not valid
 */
const validateClaimBeforeSave = async (req) => {
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

  LOG.info("Validating if the arrival date is set in the future");

  if (_isDateInFuture(claim.arrival_date)) {
    LOG.warn("Arrival date cannot be in the future");
    req.reject(400, "Arrival date cannot be in the future");
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
    const palletIds = claim.pallets.map((pallet) => pallet.pallet_id);
    const uniquePalletIds = new Set(palletIds);
    if (palletIds.length !== uniquePalletIds.size) {
      LOG.warn("Duplicate pallet ids found for claim " + claim.ID);
      req.reject(400, "Claim cannot have duplicate pallet ids");
    }
  }

  LOG.info("Run claim type specific pre-save validations");
  await _validateQCClaimBeforeSave(req);
};

updateClaimDetailsFromERP = async (claim, erpClaimsSrv) => {
  if (!claim.delivery_id) {
    LOG.warn(
      "No delivery id found in claim " + claim.ID + " to update the claim"
    );
    return;
  }

  if (
    !(
      claim.type_id === claim_types.quality ||
      claim.type_id === claim_types.packaging
    )
  ) {
    LOG.info(
      "Claim type " +
        claim.type_id +
        " for claim id " +
        claim.ID +
        " requires no ERP updates"
    );
    return;
  }

  const { DeliverySet } = erpClaimsSrv.entities;
  LOG.info(
    "Reading delivery details from ERP for delivery id " + claim.delivery_id
  );
  const deliveries = await erpClaimsSrv.run(
    SELECT.from(DeliverySet)
      .columns((delivery) => {
        delivery.brewer_id,
        delivery.brewer_name;
      })
      .where({
        delivery_id: claim.delivery_id,
      })
  );
  LOG.info("Successfully read Delivery details from ERP");

  // Update Brewer Details from ERP
  if (claim.type_id === claim_types.quality ) {
  
    LOG.info("Updating Brewer Details for Claim " + claim.ID);

    let brewer_id = null;
    let brewer_name = null;
    if (deliveries.length > 0) {
      brewer_id = deliveries[0].brewer_id;
      brewer_name = deliveries[0].brewer_name;
    }

    await UPDATE("ls.claims.Claims", { ID: claim.ID }).with({
      brewer_id: brewer_id,
      brewer_name: brewer_name,
    });
    LOG.info("Successfully updated claim details");
  }

  
};

/**
 * Calculates the virtual delivery details for a given set of deliveries.
 *
 * @async
 * @param {Array} Deliveries - An array of delivery objects. Each object should have an 'ID' property.
 */
calculateVirtualDeliveryDetails = async (Deliveries) => {
  LOG.info("Calculating virtual details for deliveries");

  if (Deliveries.length === 0) {
    LOG.info("No deliveries found exiting routine");
    return;
  }

  let deliveryIds = Deliveries.map((delivery) => delivery.ID);
  LOG.info(
    "Reading all claims for " + deliveryIds.length + " deliveries being read"
  );

  let deliveryClaims = await SELECT.from("ls.claims.Deliveries")
    .columns((delivery) => {
      delivery.ID,
        delivery.claims((claim) => {
          claim.ID,
            claim.total_claim_value,
            claim.status((status) => {
              status.id;
            });
        });
    })
    .where({ ID: { in: deliveryIds } });
  LOG.info(
    "Read " + deliveryClaims.length + " claims for all deliveries being read"
  );

  // Update the virtual attributes for each delivery found
  for (delivery of Deliveries) {
    // Dafault all the values
    delivery.open_claims = false;

    // Filter the claims for the specific delivery
    let deliveryClaim = deliveryClaims.filter(
      (deliveryClaim) => deliveryClaim.ID === delivery.ID
    );

    if (deliveryClaim.length > 0) {
      // Calculate the total claim value for the delivery
      for (claim of deliveryClaim[0].claims) {
        
        // check if the claim is open
        if (
          !(
            claim.status.id === claim_statuses.COMPLETE ||
            claim.status.id === claim_statuses.REVIEW_REJECTED
          )
        ) {
          delivery.open_claims = true;
        }
      }
    }
  }
};

/**
 * Asynchronously calculates and updates the total claim value for each claim in the provided array, including additional costs.
 * If the claim values are not present in the claim headers, they are read from the database.
 *
 * @param {Array|Object} Claim_Header - An array of claims or a single claim. Each claim header should be an object with at least an 'ID' property.
 * @returns {void} - This function does not return anything. It modifies the claim in place, adding 'total_claim_value'  properties to each one.
 * @throws {Error} - Throws an error if the database operations fail.
 */
updateClaimsTotals = async (Claim_Header) => {
  LOG.info(
    "Calculating the total claim value including additional costs"
  );

  // Calculate the total claim value including additional costs
  let claimHeaders = Claim_Header;
  if (!Array.isArray(Claim_Header)) {
    claimHeaders = [Claim_Header];
  }

  if (claimHeaders.length === 0) {
    LOG.info("No claims found exiting routine");
    return;
  }

  // Get Additional Costs for all claims being read
  LOG.info("Reading costs for all claims being read");
  let claimIds = claimHeaders.map((claim) => claim.ID);

  // If no claim value is present, then we need to read the claim cost values from the DB
  let readClaimCostsFromDb = false;
  let claims = null;
  if (!claimHeaders[0].hasOwnProperty("claim_value")) {
    readClaimCostsFromDb = true;
    claims = await SELECT.from("ls.claims.Claims")
      .columns("ID", "claim_value")
      .where({ ID: { in: claimIds } });
  }

  // Read values of any additional costs for the claim
  const costs = await SELECT.from("ls.claims.Costs")
    .columns("claim_ID", "value")
    .where({ claim_ID: { in: claimIds } });

  LOG.info("Updating costs for all claims being read");
  for (let claim of claimHeaders) {
    if (readClaimCostsFromDb === true && claims.length > 0) {
      let claimCost = claims.filter((claimCost) => claimCost.ID === claim.ID);
      claim.claim_value = Number(claimCost[0].claim_value.toFixed(2));
    }
    claim.total_claim_value = claim.claim_value | 0;

    // Add up all costs related to the claim
    const claimCosts = costs.filter((cost) => cost.claim_ID === claim.ID);
    for (let cost of claimCosts) {
      claim.total_claim_value += Number(cost.value);
    }
    claim.total_claim_value.toFixed(2);

    LOG.info("Updating costs for claim " + claim.ID);
    await UPDATE("ls.claims.Claims", { ID: claim.ID }).with({
      total_claim_value: claim.total_claim_value,
    });
  }
};

/**
 * Calculates the claim value per TCE (Total Cartons Effected) for each claim in the provided array
 * Calculates the percentage claimed
 * @param {Array} qualityClaims - An array of quality claims.
 */
calculateQualityClaimsValuesForClaim = async (claims) => {
  for (let claim of claims) {
    if (
      claim.hasOwnProperty("qualityClaim") &&
      claim.type_id === claim_types.quality &&
      claim.qualityClaim !== null
    ) {
      await _calculateQualityClaimValues(
        claim.qualityClaim,
        claim.total_claim_value
      );
    }
  }
};

calculateQualityClaimsValuesForQualityClaim = async (qualityClaims) => {
  // Get Additional Costs for all claims being read
  LOG.info("Reading costs for all claims being read");
  const claimIds = qualityClaims.map((claim) => claim.claim_ID);
  const claims = await SELECT.from("ls.claims.Claims")
    .columns("ID", "total_claim_value")
    .where({ ID: { in: claimIds } });
  LOG.info("Successfully read all costs from the DB");

  LOG.info("Updating Claim values for all quality claims");
  for (let qualityClaim of qualityClaims) {
    const claim = claims.filter(
      (claim) => claim.ID === qualityClaim.claim_ID
    )[0];
    await _calculateQualityClaimValues(
      qualityClaim,
      claim.total_claim_value
    );
  }
  LOG.info("Updated all claim values for all claims");
};

_calculateQualityClaimValues = async (claim, claim_value) => {
  let number_of_tce_out_of_spec = claim.number_of_tce_out_of_spec;
  if (!number_of_tce_out_of_spec) {
    LOG.info("Reading quality claim from the DB for " + claim.claim_ID);
    const qualityClaim = await SELECT.from("ls.claims.QualityClaims")
      .columns("claim_ID", "number_of_tce_out_of_spec")
      .where({ claim_ID: claim.claim_ID });
    number_of_tce_out_of_spec = qualityClaim[0].number_of_tce_out_of_spec;
  }

  LOG.info("Updating expanded quality claim data");
  claim.claim_value_per_tce = 0;
  
  claim.percentage_claimed = 0;
  if (number_of_tce_out_of_spec > 0) {
    claim.claim_value_per_tce = calculateClaimValuePerTce(
      claim_value,
      number_of_tce_out_of_spec
    );

    claim.percentage_claimed = Number(
      ((Number(number_of_tce_out_of_spec) / _maxTceOnPallet) * 100).toFixed(2)
    );
  }
};

_generateClaimId = async (delivery_id, offsetForSelf) => {
  LOG.info("Generating claim ID for the claim");

  LOG.info("Reading claims for the delivery ID: " + delivery_id);
  const claimsByDelivery = await SELECT("ls.claims.Claims").where({
    delivery_id: delivery_id,
  });
  LOG.info(
    "Successfully found " +
      claimsByDelivery.length +
      " claims for the delivery ID: " +
      delivery_id
  );
  let claimIndex = 0;
  if (claimsByDelivery.length) {
    claimIndex = claimsByDelivery.length;
  }

  if (offsetForSelf) {
    // When copying claims the copied claim has not been commit to the DB, so is not picked
    // up by the delivery search above.  This ensures the copied claim is attributed
    // the correct claim ID
    claimIndex++;
  }
  claimIndex = claimIndex.toString().padStart(3, "0");
  const claimId = delivery_id.slice(-7) + claimIndex;
  LOG.info("Successfully generated Claim Id " + claimId);

  return claimId;
};

updateExternalClaimId = async (ClaimHeader) => {
  LOG.info("Updating claim ID for the claim");
  LOG.info("Found Delivery Id: " + ClaimHeader.delivery_id);
  const claimId = await _generateClaimId(ClaimHeader.delivery_id);
  LOG.info("Updating the claim id of the claim to: " + claimId);
  await UPDATE("ls.claims.Claims", { ID: ClaimHeader.ID }).with({
    claim_id: claimId,
  });
};

/**
 * Asynchronously updates the status of a claim.
 *
 * @async
 * @param {number|string} claimId - The ID of the claim to update.
 * @param {number|string} statusId - The ID of the new status.
 * @param {string} statusText - The text of the new status.
 * @returns {Promise<Object>} A promise that resolves to an object containing the success status, message for the operation & the claim status
 */
updateClaimStatus = async (claimId, statusId, statusText, claimAction) => {
  LOG.info("Updating claims status to " + statusText);
  let response = {
    success: false,
    message: "",
  };

  let auditLogRecord = {
    claim_ID: claimId,
    claimAction_id:
      claimAction !== undefined
        ? claimAction.toString()
        : claimActions.CREATED.toString(),
    newStatus_id: statusId.toString(),
    originalStatus_id: null,
  };

  try {
    // Read the claim status and check the status change is valid
    claims = await SELECT.one
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

    // Hack to ensure the code is consistent for the new claim type as it is for the others
    if (claims.status === null) {
      claims.status = { id: null };
    }

    //Update the status for the audit log record
    auditLogRecord.originalStatus_id =
      claimAction !== undefined ? claims.status.id.toString() : null;

    LOG.info(
      "Read claim from DB with key " +
        claimId +
        " and found values: " +
        JSON.stringify(claims)
    );
    response.claimType = claims.type.id; //Added claim type to avoid reading DB again from the calling function
    previousValidStatusCodes = _claim_status_previous;
    switch (claims.type.id) {
      case claim_types.quality:
        previousValidStatusCodes = _claim_status_previous_qc;
        break;
    }
  } catch (e) {
    LOG.error("Errors occured reading the claim status: " + e);
    response.message = "Errors occured updating the claim";
    return response;
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

  try {
    // Update the claim status
    LOG.info("Updating the status of the claim to: " + statusText);
    await UPDATE("ls.claims.Claims", { ID: claimId }).with({
      status_id: statusId,
    });
    LOG.info("Status updated to " + statusText);
    response.success = true;
    response.message = "Claim status updated to " + statusText;

    // Update the audit log
    LOG.info(
      "Updating the audit log for the claim: " + JSON.stringify(auditLogRecord)
    );
    await INSERT.into("ls.claims.AuditLogs").entries([auditLogRecord]);
    LOG.info("Audit Log successfully added");
  } catch (e) {
    LOG.error("Errors occured updating the claim status: " + e);
    response.message = "Errors occured updating the claim";
    return response;
  }
  return response;
};


const _maxTceOnPallet = 56;


// Quality Claim
const _claim_status_previous_qc = {
  1: [null], // New
  2: [1, 6, 3], // Pending Review
  3: [2], // Info Required
  4: [2], // Review Approved
  5: [2], // Review Rejected
  6: [4], // Sent to Grower
  7: [6], // With Finance
  8: [7], // Complete
};

const _claim_status_previous = {
  1: [null], // New
  2: [1, 3], // Pending Review
  3: [2], // Info Required
  5: [2], // Review Rejected
  7: [2], // With Finance
  8: [7], // Complete
};

/**
 * Calculates the claim value per TCE (Total Cartons Effected).
 *
 * @param {number} totalClaimValue - The total value of the claim.
 * @param {number} totalCartonsEffected - The total number of effected cartons.
 * @returns {Promise<number>} The calculated claim value per TCE.
 */
calculateClaimValuePerTce = (totalClaimValue, totalCartonsEffected) => {
  return Number(
    (
      Number(totalClaimValue) / Number(Number(totalCartonsEffected)).toFixed(2)
    ).toFixed(2)
  );
};

validateBeforeSubmitForReview = async (req) => {
  let claimID = req.params[0].ID;
  LOG.info("Reading claim details for claim id: " + claimID);
  const claim = await SELECT.one
    .from("ls.claims.Claims")
    .columns((claim) => {
      claim.ID,
        claim.type_id,
        claim.qualityClaim((qualityClaim) => {
          qualityClaim.claim_ID, qualityClaim.qc_inspection_date;
        });
    })
    .where({ ID: claimID });
  LOG.info("Read claim " + JSON.stringify(claim));



  LOG.info("Validating if the claim requires QC inspection date");
  if (
    claim.type_id === claim_types.quality &&
    claim.qualityClaim.qc_inspection_date === null
  ) {
    LOG.warn(
      "QC Inspection Date is mandatory for claim with type " + claim.type_id
    );
    const claimType = await getClaimTypeById(claim.type_id);
    req.error(
      400,
      "QC Inspection Date is mandatory for claim of type " + claimType.name
    );
  }
};

/**
 * Updates the claim due to a change in claim type.
 *
 * This function reads the claim from the database and checks if the claim type has changed.
 * If the claim type has changed, it updates the claim type specific tables with the new type.
 *
 * @async
 * @param {Object} req - The request object.
 * @returns {Promise<void>} A promise that resolves when the function has completed.
 */
const updateClaimDuetoTypeChange = async (req) => {
  const claim = req.data;
  LOG.info("validating if claim type changed");

  // Read the claim to see if the type changed
  LOG.info("Reading claim " + claim.ID);
  const dbClaim = await SELECT.one
    .from("ls.claims.Claims")
    .where({ ID: claim.ID });
  LOG.info("Successfully read claim " + JSON.stringify(dbClaim));

  if (claim.type_id === dbClaim.type_id) {
    return;
  }
  LOG.info(
    "Claim type has changed from " + dbClaim.type_id + " to " + claim.type_id
  );

  // Update the claim type specific tables with the new table
  switch (claim.type_id) {
    case claim_types.quality:
      LOG.info("Creating Quality Claim Entity");
      req.data.qualityClaim = { claim_ID: claim.ID };
      break;
    case claim_types.packaging:
      LOG.info("Creating Packaging Claim Entity");
      req.data.packagingClaim = { claim_ID: claim.ID, pack_house_id: null };
      break;
    default:
      break;
  }

  // Delete the old claim type specific tables
  switch (dbClaim.type_id) {
    case claim_types.quality:
      LOG.info("Deleting old Quality Claim Entity");
      req.data.qualityClaim = null;
      break;
    case claim_types.packaging:
      LOG.info("Deleting old Packaging Claim Entity");
      req.data.packagingClaim = null;
      break;
    default:
      break;
  }
};



const calculateDaysFromArrival = async (claims) =>{
  claims.map((claim) => {
    LOG.info("Calculating days from arrival for " + claim.ID);
    claim.days_from_arrival = null;
    if (claim.arrival_date) {
      const arrivalDate = new Date(claim.arrival_date);
      const today = new Date();
      const timeDiff = Math.abs(today.getTime() - arrivalDate.getTime());
      claim.days_from_arrival = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    if(claim.days_from_arrival > 366){
      LOG.info("Defaulting days from arrival to null as it is greater than 366 for claim " + claim.ID);
      claim.days_from_arrival = null;
    }
  });
};
      

module.exports = {
  updateClaimsTotals: updateClaimsTotals,
  calculateQualityClaimsValuesForClaim: calculateQualityClaimsValuesForClaim,
  calculateVirtualDeliveryDetails: calculateVirtualDeliveryDetails,
  updateClaimStatus: updateClaimStatus,
  claim_types: claim_types,
  claim_statuses: claim_statuses,
  claimActions: claimActions,
  calculateClaimValuePerTce: calculateClaimValuePerTce,
  updateClaimDetailsFromERP: updateClaimDetailsFromERP,
  validateClaimBeforeSave: validateClaimBeforeSave,
  updateExternalClaimId: updateExternalClaimId,
  calculateQualityClaimsValuesForQualityClaim:
    calculateQualityClaimsValuesForQualityClaim,
  validateBeforeSubmitForReview: validateBeforeSubmitForReview,
  validateRepBeforeSave: validateRepBeforeSave,
  updateClaimDuetoTypeChange: updateClaimDuetoTypeChange,
  calculateDaysFromArrival:calculateDaysFromArrival
};
