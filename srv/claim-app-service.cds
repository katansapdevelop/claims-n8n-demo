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
    entity Attachments                   as projection on db.Attachments {
        *,
        @title : 'Content Length (KB)'
        contentLength / 1024 as contentLengthKB : Decimal(15, 2)
    };

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

    
}
