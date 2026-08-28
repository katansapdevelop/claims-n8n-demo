import cds from "@sap/cds";

const LOG = cds.log("ls.claims");

import { getAllConfigSettingsBySettingId, getConversionRatesByCurrency } from "./utils/ConfigUtil.cjs";

class ConfigAppService extends cds.ApplicationService {
  async init() {
    const { ConfigSettings, CurrencyConversion } = this.entities;

    this.before("CREATE", ConfigSettings.drafts, async (req, next) => {
      LOG.info("Before creating configuration");
      // Default the From and To fields on create
      let validFrom = new Date();
      validFrom.setDate(validFrom.getDate() + 1);
      req.data.validFrom = validFrom;

      let validTo = new Date();
      validTo.setDate(validTo.getDate() + 7);
      req.data.validTo = validTo;
    });

    this.before("SAVE", ConfigSettings, async (req, next) => {
      LOG.info("Before saving configuration");
      const newConfigSetting = req.data;

      LOG.info("Checking 'valid from' is not greater than 'valid to'");
      if (newConfigSetting.validFrom > newConfigSetting.validTo) {
        req.error(400, "The valid from date must be before the valid to date.");
        return;
      }

      LOG.info(
        "Validate the configuration for the setting " +
          newConfigSetting.setting_id +
          " & ensure does not overlap"
      );

      LOG.info("Reading all settings of this type from the DB");
      const settings = await getAllConfigSettingsBySettingId(
        newConfigSetting.setting_id
      );

      LOG.info(
        "Found " + settings.length + " settings in the DB for this type"
      );
      for (let setting of settings) {
        LOG.info("Skip if new setting is the same as the setting in the DB");
        if (newConfigSetting.id === setting.id) {
          continue;
        }

        if (
          (newConfigSetting.validFrom >= setting.validFrom &&
            newConfigSetting.validFrom <= setting.validTo) ||
          (newConfigSetting.validTo >= setting.validFrom &&
            newConfigSetting.validTo <= setting.validTo) ||
          (newConfigSetting.validFrom <= setting.validFrom &&
            newConfigSetting.validTo >= setting.validTo)
        ) {
          req.error(
            409,
            `The configuration for the new setting overlaps with an existing setting.`
          );
          return;
        }
      }
    });

    this.before("SAVE", CurrencyConversion, async (req, next) => {
      LOG.info("Before saving currency conversion");

      const newSetting = req.data;

      LOG.info("Checking valid from is not greate than valid to");
      if (newSetting.validFrom > newSetting.validTo) {
        req.error(400, "The valid from date must be before the valid to date.");
        return;
      }

      LOG.info("Reading all settings of this type from the DB");
      const currencySettings = await getConversionRatesByCurrency(newSetting.fromCurrency_code, newSetting.toCurrency_code);

      LOG.info(
        "Found " + currencySettings.length + " settings in the DB for this type"
      );
      for (let setting of currencySettings) {
        if (newSetting.ID === setting.ID) {
          LOG.info("Skipping as new setting is the same as the setting in the DB");
          continue;
        }

        if (
          (newSetting.validFrom >= setting.validFrom &&
            newSetting.validFrom <= setting.validTo) ||
          (newSetting.validTo >= setting.validFrom &&
            newSetting.validTo <= setting.validTo) ||
          (newSetting.validFrom <= setting.validFrom &&
            newSetting.validTo >= setting.validTo)
        ) {
          req.error(
            409,
            `The configuration for the new setting overlaps with an existing setting.`
          );
          return;
        }
      }

    });

    return super.init();
  }
}

export default ConfigAppService;
