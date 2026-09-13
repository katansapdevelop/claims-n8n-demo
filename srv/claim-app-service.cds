using {ls.claims as db} from '../db/schema';


service ClaimAppService @(path: '/app/claim', ) {
    @odata.draft.enabled
    @n8n.process.start: {path: 'submitClaimReview', method: 'POST', on: 'submitForReview'}
    entity Claims                        as
        projection on db.Claims {
            *
        }
        actions {
            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            
            action submitForReview();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action requestInfo();
            
            
            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects : {
                TargetEntities : [_it],
                TargetProperties : ['agent_approval_outcome', 'agent_approval_report']
            }
            action submitReviewApprove();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitReviewReject(reason : String enum {
                IE;
                IS;
            });

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitSendToBrewer();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitBrewerAccepted();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitBrewerRejected();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitFinanceComplete();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects : {
                TargetEntities : [_it],
                TargetProperties : ['agent_approval_outcome', 'agent_approval_report']
            }
            action updateAgentAssessment(
                outcome : Decimal(3, 0),
                report : String
            );
        };


    entity Costs                         as
        projection on db.Costs {
            *,
            virtual null as currency_code : String(3)
        };

    entity Comments                      as projection on db.Comments;
    entity Attachments                   as projection on db.Attachments {
        *,
        @title : 'Content Length (KB)'
        contentLength / 1024 as contentLengthKB : Decimal(15, 2),
        contentType like 'image/%' as isImage : Boolean @title : 'Is Image',
        case 
            when contentType = 'application/pdf' 
                then 'sap-icon://pdf-attachment' 
            else 'sap-icon://document' 
        end as sourceIcon : String(20)
    };

    @cds.redirection.target
    entity ClaimPallets                  as projection on db.ClaimPallets  {
        *,
        pallet.pallet_id as pallet_display_id,
        pallet.beer.name as beer_name,
        pallet.beer.ID as beer_ID,
        pallet.quantity as pallet_quantity,
        pallet.uom as pallet_uom
    } ;


    @readonly
    entity Deliveries                    as projection on db.Deliveries;


    @readonly
    entity Partners                      as projection on db.Partners;

    @readonly
    entity AuditLogs                     as projection on db.AuditLogs;

    @readonly
    entity ClaimsToSecondaryDefectSearch as
        select
            key claims.claim_type,
            key claims.primary_defect_code,
            key defectMap.secondary_defect_code,
            claims.primary_defect_code.name      as primary_defect_name,
            defectMap.secondary_defect_code.name as secondary_defect_name
        from db.DefectToClaimTypeMap as claims
        inner join db.PrimaryToSecondaryDefectMap as defectMap
            on claims.primary_defect_code = defectMap.primary_defect_code;

    @readonly
    entity ClaimsToPrimaryDefectSearch   as projection on db.DefectToClaimTypeMap;

   @readonly
   entity PalletSearch as 
   select  
       key pallets.ID,
       pallet_id,
       delivery.ID as delivery_ID_UUID,
       delivery.delivery_id,
       beer.beer_id,
       beer.name as beer_name,
       pallets.quantity,
       pallets.uom
       
    from db.Pallets as pallets
    inner join db.Deliveries as delivery
        on pallets.delivery.ID = delivery.ID
    inner join db.Beers as beer
        on pallets.beer.ID = beer.ID;
}
