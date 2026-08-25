using {ls.claims as db} from '../db/schema';


service ClaimAppService @(path: '/app/claim', ) {
    @odata.draft.enabled
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
            @Common.SideEffects.TargetEntities: [_it]
            action submitReviewApprove();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitReviewReject(reason : String enum {
                IE;
                IS;
            },
            convertToMarketAssistance : Boolean);

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitSendToBrewer();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitBrewerAccepted();

            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitBrewerRejected();

            // TODO Rename this action to complete
            @cds.odata.bindingparameter.name  : '_it'
            @Common.SideEffects.TargetEntities: [_it]
            action submitFinanceComplete();
        };


    entity Costs                         as
        projection on db.Costs {
            *,
            virtual null as currency_code : String(3)
        };

    entity Comments                      as projection on db.Comments;
    entity QualityClaims                 as projection on db.QualityClaims;
    entity PackagingClaims               as projection on db.PackagingClaims;
    entity Attachments                   as projection on db.Attachments;

    @cds.redirection.target
    entity ClaimPallets                  as projection on db.ClaimPallets;


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


    annotate ClaimPallets with @(Common: {SideEffects #singleSourceProperty: {
        SourceProperties: [pallet_id],
        TargetProperties: [
            'variety',
            'storage_type',
            'size',
            'pack_type',
            'pack_date',
            'packer_name',
            'region'
        ]
    }}) {

    };


    @odata.draft.enabled
    entity MarketRepresentative          as projection on db.MarketRep;

    @readonly
    entity ActiveMarketRepresentatives   as
        select
            rep.ID,
            rep.email,
            concat(
                concat(
                    firstName, ' '
                ), lastName
            ) as fullName : String  @readonly  @Common: {Text: 'Full Name'}
        from db.MarketRep as rep
        where
            active = true;

    @readonly
    @cds.redirection.target: 'MarketRepresentative'
    entity AllMarketRepresentatives      as
        select
            rep.ID,
            rep.email,
            concat(
                concat(
                    firstName, ' '
                ), lastName
            ) as fullName : String  @readonly  @Common: {Text: 'Full Name'},
            active
        from db.MarketRep as rep;

}
