const LOG = cds.log("ls.claims");
const { create } = require("@sap/cds");
const { parseQueryOptionsForFiltering } = require("./ODataUtil.cjs");
const { calculateVirtualDeliveryDetails } = require("./ClaimsUtil.cjs");
const { getAllConfigSettingsBySettingId } = require("./ConfigUtil.cjs");

/**
 * Handles the expansion of claim deliveries.
 *
 * This method fetches the deliveries from the database based on the provided delivery IDs.
 * It then updates each delivery with the corresponding expanded delivery  data.
 *
 * @async
 * @param {Object|Object[]} deliveries - The deliveries to be expanded. This can be a single delivery object or an array of delivery objects.
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 * @throws {Error} Throws an error if the operation fails.
 */
const _handleExpandAppDelivery = async (deliveries) => {
  LOG.info("Running handling logic for expand on BTP deliveries");

  // Use the delivery Ids to get the appDelivery (Could be an object or an array)

  const deliveryIds = deliveries.delivery_id
    ? [deliveries.delivery_id]
    : deliveries.map((delivery) => delivery.delivery_id);
  LOG.info(
    "Reading deliveries from the DB for " + deliveryIds.length + " deliveries"
  );

  let appDeliveries = await SELECT.from("ls.claims.Deliveries")
    .columns((delivery) => {
      delivery.ID,
        delivery.delivery_id,
        delivery.market,
        delivery.market_representative_id,
        delivery.open_claims;
    })
    .where({ delivery_id: { in: deliveryIds } });

  LOG.info(
    "Found " +
      appDeliveries.length +
      " deliveries from the DB for the requested delivery IDs"
  );

  // Add the appDelivery to the delivery
  const deliveriesToUpdate = deliveries.delivery_id ? [deliveries] : deliveries;
  for (let delivery of deliveriesToUpdate) {
    LOG.info(
      "Updating delivery id " +
        delivery.delivery_id +
        " to include extension data"
    );
    delivery.appDelivery = undefined;

    let appDelivery = appDeliveries.find(
      (appDelivery) => appDelivery.delivery_id === delivery.delivery_id
    );
    if (appDelivery) {
      LOG.info("Updating totals & status for delivery " + delivery.delivery_id);
      await calculateVirtualDeliveryDetails([appDelivery]);
      delivery.appDelivery = appDelivery;
    }
  }

  deliveries = deliveries.delivery_id
    ? deliveriesToUpdate[0]
    : deliveriesToUpdate;
};

/**
 * Handles the reading of ERP deliveries.
 *
 * This method modifies the query to read from the original ERP Service and removes navigation to BTP specific tables.
 * It then executes the query to fetch the deliveries from the ERP service.
 *
 * @async
 * @param {Object} req - The request object, containing the query to be executed.
 * @param {Object} erpClaimsSrv - The ERP Claims service object, used to run the query.
 * @returns {Promise<Array>} A Promise that resolves to an array of deliveries fetched from the ERP service.
 * @throws {Error} Throws an error if the operation fails.
 */
const onHandleReadErpDeliveries = async (req, erpClaimsSrv) => {
  LOG.info("Read Deliveries from ERP");
  let maxRecords = 300;
  let fromRecord = 0;

  let query = Object.assign({}, req.query);

  // Replace the from clause with the original ERP Service
  query.SELECT.from[0] = "Z_OCP_CLAIMS_SRV.DeliverySet";
  // Remove navigation to BTP Specific Tables
  query.SELECT.columns = query.SELECT.columns.filter(
    (column) => column.ref[0] !== "appDelivery"
  );

  try {
    LOG.info("Reading Deliveries from ERP");
    const deliveries = await erpClaimsSrv.run(req.query);
    LOG.info("Finished Reading " + deliveries.length + " Deliveries from ERP");

    if (req._queryOptions && req._queryOptions.$expand) {
      LOG.info(
        "Found expand option in the query: " + req._queryOptions.$expand
      );
      let expandCSVString = req._queryOptions.$expand.replace(/\(.*?\)/g, "");
      if (expandCSVString.split(",").includes("appDelivery")) {
        LOG.info("Found expand option for app delivery in the query");
        await _handleExpandAppDelivery(deliveries);
      }
    }

    if (deliveries.$count) {
      LOG.info("Count for ERP deliveries query is " + deliveries.$count);
    }

    return deliveries;
  } catch (error) {
    LOG.error("Error reading deliveries from ERP" + error);
    return req.error("Error reading deliveries from ERP");
  }
};

/**
 * Handles the reading of ERP pallets.
 *
 * This method reads pallets from the ERP service based on the query options provided in the request.
 * It limits the number of records fetched to a maximum of 300 and supports pagination through the `$skip` query option.
 *
 * @async
 * @param {Object} req - The request object, containing the query to be executed.
 * @param {Object} erpClaimsSrv - The ERP Claims service object, used to run the query.
 * @returns {Promise<Array>} A Promise that resolves to an array of pallets fetched from the ERP service.
 * @throws {Error} Throws an error if the operation fails.
 */
const onHandleReadErpPallets = async (req, erpClaimsSrv) => {
  LOG.info("Reading Pallets from ERP");
  let maxRecords = 300;
  let fromRecord = 0;
  const { DeliverySet, PalletSet } = erpClaimsSrv.entities;
  if (req._queryOptions && req._queryOptions.$top) {
    maxRecords = parseInt(req._queryOptions.$top);
    if (req._queryOptions.$top > 300) {
      maxRecords = 300;
      req.warn("Search results are limited to " + maxRecords + " records");
    }
  }

  if (req._queryOptions && req._queryOptions.$skip) {
    fromRecord = parseInt(req._queryOptions.$skip);
  }

  let pallets = [];
  let queryExecuted = false;
  let deliveryIdViaNavigation = null;
  // Read via navigation (We have to do this as the ECC service has not been setup correctly to support filtering by delivery Id )
  if (
    req._params &&
    req._params[0] &&
    req._params[0].hasOwnProperty("delivery_id")
  ) {
    deliveryIdViaNavigation = req._params[0];
  }

  if (
    req._queryOptions &&
    req._queryOptions.$filter &&
    req._queryOptions.$filter.startsWith("delivery_id eq")
  ) {
    let regex = /delivery_id eq '(\d+)'/;
    deliveryIdViaNavigation = {
      delivery_id: req._queryOptions.$filter.match(regex)[1],
    };
  }

  if (deliveryIdViaNavigation) {
    const deliveries = await erpClaimsSrv.run(
      SELECT.from(DeliverySet)
        .columns((delivery) => {
          delivery.DelToPal((pallet) => {
            pallet.pallet_id,
              pallet.grade,
              pallet.size,
              pallet.pack_type,
              pallet.material_id,
              pallet.variety,
              pallet.storage_type,
              pallet.delivery_id;
          });
        })
        .limit(maxRecords, fromRecord)
        .where(deliveryIdViaNavigation)
    );
    queryExecuted = true;
    if (deliveries[0]) {
      pallets = deliveries[0].DelToPal;
    }
    LOG.info(pallets.length + " Pallets were read from deliveries");
  }

  if (queryExecuted == false) {
    pallets = await erpClaimsSrv.run(
      SELECT(PalletSet).limit(maxRecords, fromRecord).where(req.dat)
    );
  }

  if (req._queryOptions && req._queryOptions.$count) {
    pallets.$count = pallets.length;
  }

  LOG.info("Finished Reading " + pallets.length + "Pallets from ERP");
  return pallets;
};

/**
 * Handles the reading of ERP RPINs.
 *
 * This method reads RPINs from the ERP service based on the query options provided in the request.
 * It limits the number of records fetched to a maximum of 300 and supports pagination through the `$skip` query option.
 * If the `$top` query option is provided and is greater than 300, a warning is issued and the number of records fetched is still limited to 300.
 *
 * @async
 * @param {Object} req - The request object, containing the query to be executed.
 * @param {Object} erpClaimsSrv - The ERP Claims service object, used to run the query.
 * @returns {Promise<Array>} A Promise that resolves to an array of RPINs fetched from the ERP service.
 * @throws {Error} Throws an error if the operation fails.
 */
const onHandleReadErpRPINs = async (req, erpClaimsSrv) => {
  LOG.info("Reading RPINs from ERP");
  let maxRecords = 300;
  let fromRecord = 0;
  const { DeliverySet, GrowerRPINSet } = erpClaimsSrv.entities;

  if (req._queryOptions && req._queryOptions.$top) {
    maxRecords = parseInt(req._queryOptions.$top);
    if (req._queryOptions.$top > 300) {
      maxRecords = 300;
      req.warn("Search results are limited to " + maxRecords + " records");
    }
  }

  if (req._queryOptions && req._queryOptions.$skip) {
    fromRecord = parseInt(req._queryOptions.$skip);
  }

  let rpins = [];
  let queryExecuted = false;
  let deliveryIdViaNavigation = null;
  // Read via navigation
  // Read via navigation (We have to do this as the ECC service has not been setup
  // to support filtering by delivery Id )
  if (
    req._params &&
    req._params[0] &&
    req._params[0].hasOwnProperty("delivery_id")
  ) {
    deliveryIdViaNavigation = req._params[0];
  }

  let rpinFilter = null;

  if (req?.query?.SELECT?.where) {
    filterOptions = parseQueryOptionsForFiltering(req);

    filterOptions.map((option) => {
      switch (option.filter) {
        case "delivery_id":
          deliveryIdViaNavigation = {
            delivery_id: option.value,
          };
          break;
        case "rpin":
          rpinFilter = option.value;
          break;
        default:
          LOG.error("Unsupported filter property " + option.filter);
          req.error("Unsupported filter property " + option.filter);
          break;
      }
    });
  }

  if (deliveryIdViaNavigation) {
    const deliveries = await erpClaimsSrv.run(
      SELECT.from(DeliverySet)
        .columns((delivery) => {
          delivery.DelToRpin((rpin) => {
            rpin.pallet_id,
              rpin.delivery_id,
              rpin.rpin,
              rpin.id,
              rpin.pack_date,
              rpin.name,
              rpin.region,
              rpin.batch_id,
              rpin.packer,
              rpin.packer_nm;
          });
        })
        .where(deliveryIdViaNavigation)
    );

    queryExecuted = true;
    if (deliveries[0]) {
      rpins = deliveries[0].DelToRpin;
    }
    LOG.info(rpins.length + " RPINs were read from deliveries");
  }

  if (queryExecuted == false) {
    LOG.info("Reading RPINs from ERP for all deliveries");
    rpins = await erpClaimsSrv.run(
      SELECT(GrowerRPINSet).limit(maxRecords, fromRecord).where(req.data)
    );
    LOG.info(rpins.length + " RPINs were read for all deliveries");
  }

  if (rpinFilter) {
    LOG.info("Filtering RPINs based on RPIN Filter");
    rpins = rpins.filter((rpin) => rpin.rpin === rpinFilter);
  }

  rpins.$count = rpins.length;

  LOG.info("Finished Reading " + rpins.length + " RPINS from ERP");
  return rpins;
};

/**
 * Handles the reading of laims.
 *
 * This method reads Delivery Claims based on the query options provided in the request.
 * It limits the number of records fetched to a maximum of 300 and supports pagination through the `$skip` query option.
 * If the `$top` query option is provided and is greater than 300, a warning is issued and the number of records fetched is still limited to 300.
 *
 * @async
 * @param {Object} req - The request object, containing the query to be executed.
 * @returns {Promise<Array>} A Promise that resolves to an array of App Claims.
 * @throws {Error} Throws an error if the operation fails.
 */
const onHandleReadAppClaims = async (req) => {
  LOG.info("Reading App Claims");
  let maxRecords = 300;
  let fromRecord = 0;

  if (req._queryOptions && req._queryOptions.$top) {
    maxRecords = parseInt(req._queryOptions.$top);
    if (req._queryOptions.$top > 300) {
      maxRecords = 300;
      req.warn("Search results are limited to " + maxRecords + " records");
    }
  }

  if (req._queryOptions && req._queryOptions.$skip) {
    fromRecord = parseInt(req._queryOptions.$skip);
  }

  let claims = [];
  let queryExecuted = false;
  let deliveryIdViaNavigation = null;
  // Read via navigation
  // Read via navigation (We have to do this as the ECC service has not been setup correctly to support filtering by delivery Id )
  if (
    req._params &&
    req._params[0] &&
    req._params[0].hasOwnProperty("delivery_id")
  ) {
    deliveryIdViaNavigation = req._params[0];
  }

  if (deliveryIdViaNavigation) {
    const dbClaims = await SELECT.from("ls.claims.Claims")
      .columns((claim) => {
        claim.delivery_id,
          claim.ID,
          claim.claim_id,
          claim.date_of_claim,
          claim.type((type) => {
            type.name, type.id;
          });
        claim.status((status) => {
          status.name, status.criticality, status.id;
        }),
          
          claim.total_claim_value,
          claim.claim_currency_code;
      })
      .where(deliveryIdViaNavigation);

    for (index in dbClaims) {
      let claim = dbClaims[index];

      claim.type = claim.type.name;
      delete claim.type.name;

      claim.status_criticality = claim.status.criticality;
      claim.status = claim.status.name;

      claims.push(claim);
    }

    LOG.info(claims.length + " Claims were read from deliveries");
  }

  if (req._queryOptions && req._queryOptions.$count) {
    claims.$count = claims.length;
  }

  LOG.info("Finished Reading " + claims.length + " Claims");
  return claims;
};

/**
 * Sets the replication job running status.
 *
 * This method updates the status of the replication job in the AppConfig table of the ls.claims.config database.
 * If the AppConfig table does not contain a record for the replication job, a new record is created with the current date and time.
 *
 * @async
 * @param {boolean} running - The new running status of the replication job.
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 * @throws {Error} Throws an error if the operation fails.
 */
const _setReplicationJobRunning = async (running) => {
  LOG.info("Updating job running status to " + running);
  const now = new Date(); // get the current date
  let tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  let config = await SELECT.one.from("ls.claims.config.AppConfig").where({
    setting_id: "REP_JOB_R",
  });

  if (!config) {
    config = {
      ID: cds.utils.uuid(),
      createdAt: now,
      createdBy: "System",
      setting_id: "REP_JOB_R",
    };
  }

  config.modifiedAt = now;
  config.modifiedBy = "System";
  config.value = running;
  config.validFrom = now;
  config.validTo = tomorrow;

  await UPSERT(config).into("ls.claims.config.AppConfig");
};

/**
 * Gets the running status of the replication job.
 *
 * This method fetches the running status of the replication job from the AppConfig table of the ls.claims.config database.
 * It logs the current running state and returns a boolean indicating whether the replication job is running.
 *
 * @async
 * @returns {Promise<boolean>} A Promise that resolves to a boolean indicating whether the replication job is running.
 * @throws {Error} Throws an error if the operation fails.
 */
const _getReplicationJobRunning = async () => {
  let running = false;

  const deliveryRepJobRunning = await getAllConfigSettingsBySettingId(
    "REP_JOB_R"
  );
  LOG.info(
    "Read Running state of the Delivery replication job as " +
      deliveryRepJobRunning
  );
  if (deliveryRepJobRunning === true) {
    running = true;
  }

  return running;
};

/**
 * Gets the configuration of the replication job.
 *
 * This method fetches the configuration of the replication job from the AppConfig table of the ls.claims.config database.
 * It returns an object containing the configuration settings for the replication job.
 *
 * @async
 * @returns {Promise<Object>} A Promise that resolves to an object containing the configuration settings for the replication job.
 * @throws {Error} Throws an error if the operation fails.
 */
const _getReplicationJobConfig = async () => {
  let settings = {
    run_job: false,
    daysBackToCheck: 1,
  };

  const deliveryRepJobConfig = await getAllConfigSettingsBySettingId("REP_JOB");

  if (
    deliveryRepJobConfig.length === 1 &&
    deliveryRepJobConfig[0].value === "true"
  ) {
    LOG.info("Delivery replication is enabled");
    settings.run_job = true;
  }

  const daysBackToCheckConfig = await getAllConfigSettingsBySettingId(
    "REP_JOB_D"
  );
  if (daysBackToCheckConfig.length === 1) {
    settings.daysBackToCheck = parseInt(daysBackToCheckConfig[0].value);
  }

  const destination = await getAllConfigSettingsBySettingId("REP_JOB_DT");
  if (destination.length === 1) {
    settings.destination = destination[0].value;
  }
  return settings;
};

/**
 * Handles the import of deliveries.
 *
 * This method checks if the delivery replication job is configured to run.
 * If it is, it calls the `importDeliveries` method to import the deliveries.
 * If it is not, it logs a message and returns immediately.
 *
 * @async
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 * @throws {Error} Throws an error if the operation fails.
 */
const importDeliveriesJobHandler = async () => {
  LOG.info("Running delivery import job");

  LOG.info(
    "Checking to see if the Delivery replication job is configured to run"
  );
  const settings = await _getReplicationJobConfig();
  if (settings.run_job === false) {
    LOG.info("Delivery replication is not configured to run");
    return;
  }
  LOG.info("Delivery replication is configured to run");

  await importDeliveries();
};

/**
 * Imports deliveries.
 *
 * This method fetches the configuration of the replication job and retrieves the service destination.
 * If the service destination is not maintained, it logs an error and returns immediately.
 * Otherwise, it imports the deliveries. The number of records imported is limited to a maximum of 20000.
 *
 * @async
 * @param {boolean} [importAll=false] - A flag indicating whether all deliveries should be imported. If false, only a subset of deliveries is imported, based on the config setting for how many days back to check.
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 * @throws {Error} Throws an error if the operation fails.
 */
const importDeliveries = async (importAll) => {
  const maxRecords = 20000;
  const settings = await _getReplicationJobConfig();
  const serviceDestination = settings.destination;

  if (!serviceDestination) {
    LOG.error(
      "Destination for Delivery Job Replication Service is not maintained in the application config"
    );
    return;
  }

  const db = await cds.connect.to("db");
  LOG.info("Connected to db");

  if ((await _getReplicationJobRunning()) === true) {
    LOG.info("Delivery replication job is already running");
    return;
  }

  await _setReplicationJobRunning("true");

  let erpClaimsSrv = null;
  LOG.info("Checking if credentials are maintained for ERP Service");
  if (cds.env.requires["Z_OCP_CLAIMS_SRV"]?.credentials?.destination) {
    let clonedSettings = JSON.parse(
      JSON.stringify(cds.env.requires["Z_OCP_CLAIMS_SRV"])
    );
    LOG.info(
      "Replacing destination details for ERP Service with configured destination " +
        serviceDestination
    );
    clonedSettings.credentials.destination = serviceDestination;

    erpClaimsSrv = await cds.connect.to("Z_OCP_CLAIMS_SRV", clonedSettings);
    LOG.info(
      "Connected to ERP Claims Service via Destination " + serviceDestination
    );
  } else {
    erpClaimsSrv = await cds.connect.to("Z_OCP_CLAIMS_SRV");
    LOG.info("Connected to ERP Claims Service");
  }

  const { DeliverySet } = erpClaimsSrv.entities;

  let fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - settings.daysBackToCheck);
  fromDate = fromDate.toISOString();
  LOG.info("Checking ERP for all deliveries changed since " + fromDate);
  let deliveries = null;
  if (importAll) {
    deliveries = await erpClaimsSrv.run(
      SELECT.from(DeliverySet)
        .columns((delivery) => {
          delivery.delivery_id;
        })
        .limit(maxRecords)
    );
  } else {
    deliveries = await erpClaimsSrv.run(
      SELECT.from(DeliverySet)
        .columns((delivery) => {
          delivery.delivery_id;
        })
        .limit(maxRecords)
        .where({ delivery_chg_date: { ">=": fromDate } })
    );
  }

  LOG.info("Found " + deliveries.length + " deliveries from ERP");
  if (deliveries.length === maxRecords) {
    LOG.info(
      "Max records reached, please check and run the job manually to import more deliveries"
    );
  }

  for (let delivery of deliveries) {
    await importDelivery(delivery.delivery_id, erpClaimsSrv);
  }

  LOG.info(
    "Completed running delivery import job to import " +
      deliveries.length +
      " deliveries"
  );
  await _setReplicationJobRunning("false");
};

/**
 * Imports a single delivery.
 *
 * This method imports a delivery with the provided ID from the ERP Claims service.
 * It first checks if the delivery has already been imported. If it has not, it fetches the delivery data from the ERP Claims service and imports it.
 *
 * @async
 * @param {string} delivery_id - The ID of the delivery to be imported.
 * @param {Object} erpClaimsSrv - The ERP Claims service object, used to fetch the delivery data.
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 * @throws {Error} Throws an error if the operation fails.
 */
const importDelivery = async (delivery_id, erpClaimsSrv) => {
  LOG.info("Importing delivery with ID " + delivery_id);

  const { DeliverySet } = erpClaimsSrv.entities;
  LOG.info("Check to see if is already imported");
  let appDelivery = await SELECT.one
    .from("ls.claims.Deliveries")
    .columns((delivery) => {
      delivery.ID,
        delivery.delivery_id,
        delivery.container_id,
        delivery.customer_id,
        delivery.shipment_id,
        delivery.customer_name,
        delivery.origin_country,
        delivery.delivery_date,
        delivery.discharge_country;
    })
    .where({ delivery_id: delivery_id });

  LOG.info("Reading Delivery from ERP for: " + delivery_id);
  const erpDelivery = await erpClaimsSrv.run(
    SELECT.one.from(DeliverySet).where({
      delivery_id: delivery_id,
    })
  );

  let delivery = {
    delivery_id: erpDelivery.delivery_id,
    container_id: erpDelivery.container_id,
    customer_id: erpDelivery.customer_id,
    shipment_id: erpDelivery.shipment_id,
    customer_name: erpDelivery.customer_name,
    origin_country: erpDelivery.origin_country,
    sales_region: erpDelivery.sales_region,
    sales_region_desc: erpDelivery.sales_region_desc,
    delivery_date: erpDelivery.customer_delivery_date,
    discharge_country: erpDelivery.discharge_country,
  };
  LOG.info(delivery);

  var logMessage = "";
  if (appDelivery == undefined) {
    //Insert the Delivery into the DB
    LOG.info("Importing Delivery Id " + delivery_id);
    await INSERT.into("ls.claims.Deliveries").entries(delivery);

    logMessage = "Delivery Id " + delivery_id + " successfully imported";
  } else {
    //Update the Delivery into the DB
    LOG.info("Updating Delivery Id " + delivery_id);
    await UPDATE("ls.claims.Deliveries", { ID: appDelivery.ID }).with(delivery);

    logMessage = "Delivery Id " + delivery_id + " successfully reimported";
  }
  LOG.info(logMessage);
  return logMessage;
};

const onHandleReadErpDelivery = async (req, erpClaimsSrv) => {
  let deliveryIdViaNavigation = null;

  const { DeliverySet } = erpClaimsSrv.entities;

  if (req?.query?.SELECT?.where) {
    filterOptions = parseQueryOptionsForFiltering(req);

    filterOptions.map((option) => {
      switch (option.filter) {
        case "delivery_id":
          deliveryIdViaNavigation = {
            delivery_id: option.value,
          };
          break;
        case "rpin":
          // Ignore RPIN
          break;
        default:
          LOG.error("Unsupported filter property " + option.filter);
          req.error("Unsupported filter property " + option.filter);
          break;
      }
    });
  }

  const deliveries = await erpClaimsSrv.run(
    SELECT.from(DeliverySet)
      .columns((delivery) => {
        delivery`.*`,
          delivery.DelToRpin((rpin) => {
            rpin`.*`;
          }),
          delivery.DelToPal((pallet) => {
            pallet`.*`;
          });
      })
      .where(deliveryIdViaNavigation)
  );
  if (deliveries && deliveries.length > 0) {
    return deliveries[0];
  }
};

module.exports = {
  onHandleReadErpDelivery: onHandleReadErpDelivery,
  onHandleReadErpDeliveries: onHandleReadErpDeliveries,
  onHandleReadErpPallets: onHandleReadErpPallets,
  onHandleReadErpRPINs: onHandleReadErpRPINs,
  onHandleReadAppClaims: onHandleReadAppClaims,
  importDeliveriesJobHandler: importDeliveriesJobHandler,
  importDelivery: importDelivery,
  importDeliveries: importDeliveries,
};
