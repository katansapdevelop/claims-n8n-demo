using {ls.claims.config as db} from '../db/config';

service ConfigAppService @(path: '/app/config', ) {
    @odata.draft.enabled
    entity ConfigSettings as projection on db.AppConfig;

    @odata.draft.enabled
    entity CurrencyConversion as projection on db.CurrencyConversion;

}
