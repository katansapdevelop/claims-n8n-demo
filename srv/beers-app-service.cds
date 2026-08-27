using {ls.claims as db} from '../db/schema';

service BeerAppService @(path: '/app/beer', ) {
    @odata.draft.enabled
    entity Beers as projection on db.Beers;

    @readonly
    @cds.redirection.target
    entity Partners as projection on db.Partners;

    @readonly
    entity BrewerySearch as
        select 
        key brewery.ID,
        brewery.partner_id,
        @title : 'Name'
        brewery.name,
        brewery.street_address,
        brewery.city,
        brewery.postal_code,
        brewery.country
        from db.Partners as brewery
        where brewery.type = 'BR'; // Brewery Partners Only
}