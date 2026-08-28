using {ls.claims as db} from '../db/schema';

service DeliveryAppService @(path: '/app/delivery', ) {
    @odata.draft.enabled
    entity Deliveries as projection on db.Deliveries;

    entity Pallets as projection on db.Pallets;
    @readonly
    entity Beer as projection on db.Beers;

    @readonly
    @cds.redirection.target
    entity Partners as projection on db.Partners;

    @readonly
    entity BrewerySearch as
        select 
        key brewery.ID,
        brewery.partner_id,
        brewery.name,
        brewery.street_address,
        brewery.city,
        brewery.postal_code,
        brewery.country
        from db.Partners as brewery
        where brewery.type = 'BR'; // Brewery Partners Only

    @readonly
    entity ShipperSearch as
        select 
        key shipper.ID,
        shipper.partner_id,
        shipper.name,
        shipper.street_address,
        shipper.city,
        shipper.postal_code,
        shipper.country
        from db.Partners as shipper
        where shipper.type = 'SH'; // Shipping Partners Only
    
    @readonly
    entity CustomerSearch as
        select 
        key customer.ID,
        customer.partner_id,
        customer.name,
        customer.street_address,
        customer.city,
        customer.postal_code,
        customer.country
        from db.Partners as customer
        where customer.type = 'CU'; // Customer Partners Only
}