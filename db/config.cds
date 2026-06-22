using {
  managed,
  cuid,
  Currency,
  sap.common.CodeList,
} from '@sap/cds/common';

namespace tg.claims.config;

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


