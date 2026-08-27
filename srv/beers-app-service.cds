using {ls.claims as db} from '../db/schema';

service BeerAppService @(path: '/app/beer', ) {
    @odata.draft.enabled
    entity Beers as projection on db.Beers;

    @readonly
    entity Partners as projection on db.Partners;

    
}