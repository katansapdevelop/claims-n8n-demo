using {
  managed,
  cuid,
  Currency,
  sap.common.CodeList,
} from '@sap/cds/common';

namespace ls.claims.config;

@Common.Label: 'Settings Codes'
entity SettingCodes : CodeList {
  key id : String(10);
}

@Common.Label: 'Application Configurations'
entity AppConfig : cuid, managed {
  setting   : Association to one SettingCodes @Common.Label: 'Setting';
  value     : String(200)                     @Common.Label: 'Value';
  validFrom : Timestamp                       @Common.Label: 'Valid From';
  validTo   : Timestamp                       @Common.Label: 'Valid To';
}

@Common.Label: 'Currency Conversions'
entity CurrencyConversion : cuid, managed {
  fromCurrency : Currency       @Common.Label: 'From Currency';
  toCurrency   : Currency       @Common.Label: 'To Currency';
  rate         : Decimal(10, 4) @Common.Label: 'Rate';
  validFrom    : Timestamp      @Common.Label: 'Valid From';
  validTo      : Timestamp      @Common.Label: 'Valid To';
}

@Common.Label: 'Claude AI Models'
entity ClaudeAIModels {
  key model   : String(100) @Common.Label: 'Model Name';
  description : String(500) @Common.Label: 'Description';
  tokenPriceBasis : Integer @Common.Label: 'Token Price Basis';
  tokenPriceInput : Decimal(10, 2) @Common.Label: 'Token Price Input';
  tokenPriceOutput : Decimal(10, 2) @Common.Label: 'Token Price Output';
  FiveMinCachePrice : Decimal(10, 2) @Common.Label: '5m Cache Price';
  OneHourCachePrice : Decimal(10, 2) @Common.Label: '1h Cache Price';
  HitsAndRefreshesPrice : Decimal(10, 2) @Common.Label: 'Hits and Refreshes Price';

}