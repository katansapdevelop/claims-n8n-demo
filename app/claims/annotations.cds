using ClaimAppService as service from '../../srv/claim-app-service';
using from '../../db/schema';

annotate service.Claims with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : claim_id,
        },
        {
            $Type : 'UI.DataField',
            Value : type_id,
        },
        {
            $Type : 'UI.DataField',
            Value : grower_name,
        },
        {
            $Type : 'UI.DataField',
            Value : total_claim_value,
        },
        {
            $Type : 'UI.DataField',
            Value : total_claim_value_nzd,
        },
        {
            $Type : 'UI.DataField',
            Value : delivery_id,
        },
        {
            $Type : 'UI.DataField',
            Value : payment_deduction_doc_id,
        },
        {
            $Type : 'UI.DataField',
            Value : status.descr,
            Label : 'Status',
        },
    ],
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General',
            ID : 'General',
            Target : '@UI.FieldGroup#General',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Delivery',
            ID : 'Delivery',
            Target : '@UI.FieldGroup#Delivery',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Evidence',
            ID : 'Attachment',
            Target : 'attachments/@UI.LineItem#Attachment',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Secondary Defects',
            ID : 'Defects',
            Target : 'defects/@UI.LineItem#Defects',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Additional Costs',
            ID : 'AdditionalCosts',
            Target : 'costs/@UI.LineItem#AdditionalCosts',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Audit Log',
            ID : 'AuditLog',
            Target : 'auditLog/@UI.LineItem#AuditLog',
        },
    ],
    UI.FieldGroup #General : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : delivery_id,
            },
            {
                $Type : 'UI.DataField',
                Value : type_id,
            },
            {
                $Type : 'UI.DataField',
                Value : primary_defect_code_id,
            },
            {
                $Type : 'UI.DataField',
                Value : claim_value,
            },
            {
                $Type : 'UI.DataField',
                Value : claim_value_nzd,
            },
            {
                $Type : 'UI.DataField',
                Value : payment_deduction_doc_id,
                @UI.Hidden : (status.id != 7 and status.id != 8),
            },
            {
                $Type : 'UI.DataField',
                Value : RejectionReason_id,
                @UI.Hidden : (RejectionReason.id != null or RejectionReason.id != '')
            },
            {
                $Type : 'UI.DataField',
                Value : date_of_claim,
            },
            {
                $Type : 'UI.DataField',
                Value : days_from_arrival,
            },
            {
                $Type : 'UI.DataField',
                Value : days_to_claim,
            },
            {
                $Type : 'UI.DataField',
                Value : grower_id,
            },
            {
                $Type : 'UI.DataField',
                Value : grower_name,
            },
        ],
    },
    UI.HeaderInfo : {
        Title : {
            $Type : 'UI.DataField',
            Value : type.name,
        },
        TypeName : '',
        TypeNamePlural : '',
        Description : {
            $Type : 'UI.DataField',
            Value : claim_id,
        },
    },
    UI.FieldGroup #Delivery : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : delivery.customer_id,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.customer_name,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.delivery_date,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.discharge_country,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.origin_country,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.sales_region_desc,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.shipment_id,
            },
        ],
    },
    UI.Identification : [
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitForReview',
            Label : 'Submit For Review',
            Determining : true,
            @UI.Hidden: ((status.id != 1 and status.id != 3) or $draft.HasActiveEntity = true) ,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.requestInfo',
            Label : 'Request Info',
            Determining : true,
            @UI.Hidden : ((status.id != 2) or $draft.HasActiveEntity = true),
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitReviewApprove',
            Label : 'Approve Review',
            Determining : true,
            @UI.Hidden : ((status.id != 2) or $draft.HasActiveEntity = true),
            Criticality : #Positive,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitReviewReject',
            Label : 'Reject Review',
            Determining : true,
            @UI.Hidden : ((status.id != 2) or $draft.HasActiveEntity = true),
            Criticality : #Negative,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitSendToGrower',
            Label : 'Send To Grower',
            Determining : true,
            @UI.Hidden : ((status.id != 4) or $draft.HasActiveEntity = true)    ,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitGrowerAccepted',
            Label : 'Grower Accepted',
            Determining : true,
            @UI.Hidden : ((status.id != 6 and type.id != 'qc') or $draft.HasActiveEntity = true)    ,
            Criticality : #Positive,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitGrowerRejected',
            Label : 'Grower Rejected',
            Determining : true,
            @UI.Hidden : ((status.id != 6 and type.id != 'qc') or $draft.HasActiveEntity = true)    ,
            Criticality : #Negative,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitFinanceComplete',
            Label : 'Finance Completed',
            Determining : true,
            @UI.Hidden: ((status.id != 7) or $draft.HasActiveEntity = true) ,
        },
    ],
    UI.HeaderFacets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Info',
            ID : 'Status',
            Target : '@UI.FieldGroup#Status',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Total Value',
            ID : 'TotalValue',
            Target : '@UI.FieldGroup#TotalValue',
        },
    ],
    UI.FieldGroup #Status : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : status_id,
                Criticality : status.criticality,
            },
        ],
    },
    UI.UpdateHidden : (status.id != 1 and status.id != 3 and status.id != 7),
    UI.DeleteHidden : (status.id = 8),
    UI.FieldGroup #TotalValue : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : total_claim_value,
                Label : 'Value',
            },
            {
                $Type : 'UI.DataField',
                Value : total_claim_value_nzd,
                Label : 'Value (NZD)',
            },
        ],
    },
);

annotate service.Claims with {
    total_claim_value @Measures.ISOCurrency : claim_currency_code
};

annotate service.Attachments with @(
    UI.LineItem #Attachment : [
        {
            $Type : 'UI.DataField',
            Value : claim.attachments.content,
            Label : 'Attachment Name',
        },
        {
            $Type : 'UI.DataField',
            Value : createdAt,
            Label : 'Uploaded On',
        },
        {
            $Type : 'UI.DataField',
            Value : createdBy,
            Label : 'Uploaded By',
        },
    ]
);

annotate service.Claims with {
    delivery_id @(
        Common.FieldControl : #Mandatory,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Deliveries',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : delivery_id,
                    ValueListProperty : 'delivery_id',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'customer_id',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'customer_name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'container_id',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'delivery_date',
                },
            ],
            Label : 'Delivery Search',
            PresentationVariantQualifier : 'vh_Claims_delivery_id',
        },
        Common.ValueListWithFixedValues : false,
    )
};

annotate service.Deliveries with @(
    UI.PresentationVariant #vh_Claims_delivery_id : {
        $Type : 'UI.PresentationVariantType',
        SortOrder : [
            {
                $Type : 'Common.SortOrderType',
                Property : delivery_id,
                Descending : false,
            },
        ],
    }
);

annotate service.PrimaryDefectCodes with {
    descr @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'PrimaryDefectCodes',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : descr,
                    ValueListProperty : 'id',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'descr',
                },
            ],
            Label : 'Defecf Code',
        },
        Common.ValueListWithFixedValues : true,
)};

annotate service.Claims with {
    primary_defect_code @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'ClaimsToPrimaryDefectSearch',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : primary_defect_code_id,
                    ValueListProperty : 'primary_defect_code_id',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'primary_defect_code/name',
                },
                {
                    $Type : 'Common.ValueListParameterIn',
                    ValueListProperty : 'claim_type/id',
                    LocalDataProperty : type_id,
                },
            ],
            Label : 'Defect Code',
        },
        Common.ValueListWithFixedValues : true,
        Common.Text : primary_defect_code.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.PrimaryDefectCodes with {
    id @(
        Common.Text : name,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'PrimaryDefectCodes',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : id,
                    ValueListProperty : 'id',
                },
            ],
            Label : 'Primary Defect Code',
            PresentationVariantQualifier : 'vh_PrimaryDefectCodes_id',
        },
        Common.ValueListWithFixedValues : true,
        )
};

annotate service.PrimaryDefectCodes with @(
    UI.PresentationVariant #vh_Claims_primary_defect_code : {
        $Type : 'UI.PresentationVariantType',
        SortOrder : [
            {
                $Type : 'Common.SortOrderType',
                Property : id,
                Descending : false,
            },
        ],
    },
    UI.PresentationVariant #vh_PrimaryDefectCodes_id : {
        $Type : 'UI.PresentationVariantType',
        SortOrder : [
            {
                $Type : 'Common.SortOrderType',
                Property : id,
                Descending : false,
            },
        ],
    },
);

annotate service.Attachments with {
    name @Common.FieldControl : #ReadOnly
};

annotate service.ClaimPallets with @(
    UI.LineItem #Pallets : [
        {
            $Type : 'UI.DataField',
            Value : pallet_id,
        },
        {
            $Type : 'UI.DataField',
            Value : packer_name,
        },
        {
            $Type : 'UI.DataField',
            Value : rpin,
        },
        {
            $Type : 'UI.DataField',
            Value : size,
        },
        {
            $Type : 'UI.DataField',
            Value : storage_type,
        },
        {
            $Type : 'UI.DataField',
            Value : region,
        },
        {
            $Type : 'UI.DataField',
            Value : pack_type,
        },
        {
            $Type : 'UI.DataField',
            Value : pack_date,
        },
        {
            $Type : 'UI.DataField',
            Value : batch_id,
        },
        {
            $Type : 'UI.DataField',
            Value : variety,
        },
    ]
);

annotate service.ClaimDefects with @(
    UI.LineItem #Defects : [
        {
            $Type : 'UI.DataField',
            Value : secondary_defect_code_id,
            Label : 'Code',
        },
    ]
);

annotate service.ClaimDefects with {
    secondary_defect_code @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'SecondaryDefectCodes',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : secondary_defect_code_id,
                    ValueListProperty : 'id',
                },
            ],
            Label : 'Secondary Defect Code',
        },
        Common.ValueListWithFixedValues : true,
)};

annotate service.SecondaryDefectCodes with {
    id @Common.Text : name
};

annotate service.AuditLogs with @(
    UI.LineItem #AuditLog : [
        {
            $Type : 'UI.DataField',
            Value : claimAction_id,
        },
        {
            $Type : 'UI.DataField',
            Value : originalStatus_id,
        },
        {
            $Type : 'UI.DataField',
            Value : newStatus_id,
        },
        {
            $Type : 'UI.DataField',
            Value : createdBy,
            Label : '{i18n>ActionedBy}',
        },
        {
            $Type : 'UI.DataField',
            Value : createdAt,
            Label : '{i18n>ActionedOn}',
        },
    ]
);

annotate service.AllMarketRepresentatives with {
    fullName @(
        Common.Text : 'Full Name',
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.ExternalID : fullName,
)};

annotate service.AuditLogs with {
    originalStatus @(
        Common.Text : originalStatus.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.AuditLogs with {
    newStatus @(
        Common.Text : newStatus.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.AuditLogs with {
    claimAction @(
        Common.Text : claimAction.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.Costs with @(
    UI.LineItem #AdditionalCosts : [
        {
            $Type : 'UI.DataField',
            Value : cost_type_id,
        },
        {
            $Type : 'UI.DataField',
            Value : value,
        },
        {
            $Type : 'UI.DataField',
            Value : value_nzd,
        },
        {
            $Type : 'UI.DataField',
            Value : createdAt,
            @UI.Hidden,
        },
        {
            $Type : 'UI.DataField',
            Value : createdBy,
            @UI.Hidden,
        },
        {
            $Type : 'UI.DataField',
            Value : modifiedAt,
            @UI.Hidden,
        },
        {
            $Type : 'UI.DataField',
            Value : modifiedBy,
            @UI.Hidden,
        },
    ]
);

annotate service.Costs with {
    value @Measures.ISOCurrency : currency_code
};

annotate service.Costs with {
    cost_type @(
        Common.Text : cost_type.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.Claims with {
    type @(
        Common.Text : type.name,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'ClaimType',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : type_id,
                    ValueListProperty : 'id',
                },
            ],
            Label : 'Claim Type',
        },
        Common.ValueListWithFixedValues : true,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.FieldControl : #Mandatory,
        
)};

annotate service.ClaimType with {
    id @Common.Text : name
};

annotate service.Claims with {
    status @(
        Common.Text : status.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.Claims with {
    RejectionReason @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'RejectionReason',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : RejectionReason_id,
                    ValueListProperty : 'id',
                },
            ],
            Label : 'Rejection Reason',
        },
        Common.ValueListWithFixedValues : true,
        Common.FieldControl : #ReadOnly,
)};

annotate service.RejectionReason with {
    id @Common.Text : descr
};

annotate service.Claims with {
    claim_value @Measures.ISOCurrency : claim_currency_code
};

