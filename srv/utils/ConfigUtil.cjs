const LOG = cds.log("tg.claims");

let validRates = null;

getValidConfigSettingByIds = async (settingIds) => {
  const now = new Date().toISOString();
  let settings = await SELECT.from("tg.claims.config.AppConfig")
    .columns((setting) => {
      setting`.*`;
    })
    .where({
      validFrom: { "<=": now },
      and: { validTo: { ">=": now }, and: { setting_id: settingIds } },
    });

  settings = settings.map((setting) => {
    return {
      setting_id: setting.setting_id,
      value: setting.value,
    };
  });
  return settings;
};

getValidConfigSettings = async () => {
  const now = new Date().toISOString();
  let settings = await SELECT.from("tg.claims.config.AppConfig")
    .columns((setting) => {
      setting`.*`;
    })
    .where({
      validFrom: { "<=": now },
      and: { validTo: { ">=": now } },
    });

  settings = settings.map((setting) => {
    return {
      setting_id: setting.setting_id,
      value: setting.value,
    };
  });
  return settings;
};

getAllConfigSettingsBySettingId = async (settingId) => {
  let settings = await SELECT.from("tg.claims.config.AppConfig")
    .columns((setting) => {
      setting`.*`;
    })
    .where({ setting_id: settingId });

  settings = settings.map((setting) => {
    return {
      setting_id: setting.setting_id,
      value: setting.value,
      validFrom: setting.validFrom,
      validTo: setting.validTo,
    };
  });
  return settings;
};

getConversionRatesByCurrency = async (fromCurrency, toCurrency) => {
  const now = new Date().toISOString();

  const rates = await SELECT.from("tg.claims.config.CurrencyConversion")
    .columns((conversion) => {
      conversion`.*`;
    })
    .where({
      fromCurrency_code: { "=": fromCurrency },
      and: { toCurrency_code: { "=": toCurrency } },
    });

  return rates;
};

/**
 * Asynchronously gets the conversion rate between two currencies.
 *
 * @async
 * @param {string} fromCurrency - The currency to convert from.
 * @param {string} toCurrency - The currency to convert to.
 * @returns {Promise<number>} The conversion rate between the two currencies.
 * @throws {Error} If the conversion rate cannot be retrieved.
 */
getValidConversionRateByCurrency = async (fromCurrency, toCurrency) => {
  const now = new Date().toISOString();
  if (!validRates) {
    validRates = await SELECT.from("tg.claims.config.CurrencyConversion")
      .columns((conversion) => {
        conversion`.*`;
      })
      .where({ validFrom: { "<=": now }, and: { validTo: { ">=": now } } });
  }

  const filteredRates = validRates.filter(
    (conv) =>
      conv.fromCurrency_code === fromCurrency &&
      conv.toCurrency_code === toCurrency
  );

  if (filteredRates.length === 0) {
    throw new Error(
      `Conversion rate not found for ${fromCurrency} to ${toCurrency}`
    );
  }

  if (filteredRates.length > 1) {
    throw new Error(
      `Multiple conversion rates found for ${fromCurrency} to ${toCurrency}`
    );
  }

  return filteredRates[0].rate;
};

module.exports = {
  getAppSettings: getValidConfigSettings,
  getAllConfigSettingsBySettingId: getAllConfigSettingsBySettingId,
  getValidConversionRateByCurrency: getValidConversionRateByCurrency,
  getConversionRatesByCurrency: getConversionRatesByCurrency,
  getValidConfigSettingByIds: getValidConfigSettingByIds,
};
