
const LOG = cds.log("ls.claims");

/**
 * Parses query options from the request object for filtering purposes.
 * 
 * This function extracts query parameters related to filtering from the request object
 * and formats them for use in database queries or other filtering operations. It is
 * specifically designed to work with OData query parameters but can be adapted for
 * other purposes.
 * 
 * It has been deliberately limited to only handle AND operations to support simple use for 
 * on premise ABAP calls that do not support full OData openation capablities
 * 
 * @param {Object} req - The request object from which to extract query options.
 * @returns {Object} An object containing the formatted query options for filtering.
 */
const parseQueryOptionsForFiltering = (req) => {
    LOG.info("Parsing Query Options for Filtering");
    let filterOptions = [];
    
    if (req?.query?.SELECT?.where) {
      LOG.info("Parsing " + JSON.stringify(req.query.SELECT.where));
      let filterOptionProperties = [];
      let propertyCounter = 0;
      let counter = 0;
      let filterOption = null;
      for (const option of req.query.SELECT.where) {
        counter++;
        if (propertyCounter == 3) {
          if (option !== "and") {
            LOG.error("Unsupported filter option " + option);
            req.error("Unsupported filter option " + option);
          } else {
            filterOption = {
              filter: filterOptionProperties[0].ref[0],
              value: filterOptionProperties[2].val,
            };
            filterOptions.push(filterOption);
            propertyCounter = 0;
            filterOptionProperties = [];
          }
        } else {
          filterOptionProperties.push(option);
          propertyCounter++;
        }
        if (counter === req.query.SELECT.where.length) {
          filterOption = {
            filter: filterOptionProperties[0].ref[0],
            value: filterOptionProperties[2].val,
          };
          filterOptions.push(filterOption);
        }
      }
      LOG.info("ERP Filter Options " + JSON.stringify(filterOptions));
      return filterOptions;
    }
  };

module.exports = {
    parseQueryOptionsForFiltering: parseQueryOptionsForFiltering,
  };
  