using ClaimAppService as service from '../../srv/claim-app-service';
using from '../../db/schema';

annotate service.Claims with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : claim_id,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : type_id,
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : delivery.ID,
            Label : 'Delivery Id',
        },
        {
            $Type : 'UI.DataField',
            Value : delivery.customer.name,
            Label : 'Customer Name',
            @UI.Importance : #High,
        },
        {
            $Type : 'UI.DataField',
            Value : delivery.brewer.name,
            Label : 'Brewer Name',
        },
        {
            $Type : 'UI.DataField',
            Value : total_claim_value,
        },
        {
            $Type : 'UI.DataField',
            Value : status.descr,
            Label : 'Status',
            Criticality : status.criticality,
            CriticalityRepresentation : #WithoutIcon,
        },
        {
            $Type : 'UI.DataField',
            Value : primary_defect_code_id,
        },
        {
            $Type : 'UI.DataField',
            Value : payment_deduction_doc_id,
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
            Label : 'Defects',
            ID : 'Defects1',
            Target : '@UI.FieldGroup#Defects',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Additional Costs',
            ID : 'AdditionalCosts',
            Target : 'costs/@UI.LineItem#AdditionalCosts',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Supplementary Evidence',
            ID : 'Attachment',
            Target : 'attachments/@UI.LineItem#Attachment',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Agent Assessment',
            ID : 'AgentAssessment',
            Target : '@UI.FieldGroup#AgentAssessment',
            @UI.Hidden: (agent_approval_outcome = 0),
        },
    ],
    UI.FieldGroup #General : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : type_id,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery_ID,
            },
            {
                $Type : 'UI.DataField',
                Value : claim_value,
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
                Value : description,
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
                Value : delivery.delivery_date,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.shipment_id,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.brewer.country,
                Label : 'Origin Country',
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.customer.country,
                Label : 'Discharge Country',
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
            Action : 'ClaimAppService.submitSendToBrewer',
            Label : 'Send To Brewer',
            Determining : true,
            @UI.Hidden : ((status.id != 4) or $draft.HasActiveEntity = true)    ,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitBrewerAccepted',
            Label : 'Brewer Accepted',
            Determining : true,
            @UI.Hidden : ((status.id != 6 and type.id != 'qc') or $draft.HasActiveEntity = true)    ,
            Criticality : #Positive,
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ClaimAppService.submitBrewerRejected',
            Label : 'Brewer Rejected',
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
            Label : 'Customer',
            ID : 'Customer',
            Target : '@UI.FieldGroup#Customer',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Brewer',
            ID : 'Brewer',
            Target : '@UI.FieldGroup#Brewer',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Shipping Partner',
            ID : 'ShippingPartner',
            Target : '@UI.FieldGroup#ShippingPartner',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'agent_approval_outcome',
            Target : '@UI.DataPoint#agent_approval_outcome',
            @UI.Hidden: (agent_approval_outcome = 0),
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
            {
                $Type : 'UI.DataField',
                Value : total_claim_value,
                Label : 'Total Value',
            },
        ],
    },
    UI.UpdateHidden : (status.id != 1 and status.id != 3 and status.id != 7),
    UI.DeleteHidden : (status.id = 8),
    UI.FieldGroup #TotalValue : {
        $Type : 'UI.FieldGroupType',
        Data : [
            
           
        ],
    },
    UI.FieldGroup #Defects : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : primary_defect_code_id,
            },
            {
                $Type : 'UI.DataField',
                Value : defects.secondary_defect_code_id,
                Label : 'Secondary Defect Codes',
            },
        ],
    },
    UI.FieldGroup #Customer : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : delivery.customer.partner_id,
                Label : 'Id',
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.customer.name,
                Label : 'Name',
            },
        ],
    },
    UI.FieldGroup #Brewer : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : delivery.brewer.partner_id,
                Label : 'Id',
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.brewer.name,
                Label : 'Name',
            },
        ],
    },
    UI.SelectionFields : [
        status_id,
        total_claim_value,
    ],
    UI.FieldGroup #ShippingPartner : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : delivery.shipping_partner.partner_id,
                Label : 'Id',
            },
            {
                $Type : 'UI.DataField',
                Value : delivery.shipping_partner.name,
                Label : 'Name',
            },
        ],
    },
    UI.DataPoint #agent_approval_outcome : {
        $Type : 'UI.DataPointType',
        Value : agent_approval_outcome,
        TargetValue  : 100.0,
        Title : 'Approval',
        Visualization : #Progress,
        Description : '',
    },
    UI.FieldGroup #AgentAssessment : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : agent_approval_report,
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
            Value : type_id,
        },
        {
            $Type : 'UI.DataField',
            Value : content,
            Label : 'Name',
        },
        {
            $Type : 'UI.DataField',
            Value : contentType,
            Label : 'Content Type',
        },
        {
            $Type : 'UI.DataField',
            Value : contentLengthKB,
            Label : 'Content Length',
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
            CollectionPath : 'ClaimsToSecondaryDefectSearch',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : secondary_defect_code_id,
                    ValueListProperty : 'secondary_defect_code_id',
                },
                {
                    $Type : 'Common.ValueListParameterIn',
                    ValueListProperty : 'primary_defect_code_id',
                    LocalDataProperty : claim.primary_defect_code_id,
                },
                {
                    $Type : 'Common.ValueListParameterIn',
                    ValueListProperty : 'claim_type_id',
                    LocalDataProperty : claim.type_id,
                },
            ],
            Label : 'Secondary Defect Code',
        },
        Common.ValueListWithFixedValues : true,
        Common.Text : secondary_defect_code.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
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


annotate service.Claims with {
    description @UI.MultiLineText : true
};

annotate service.Claims with {
    delivery @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Deliveries',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : delivery_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'customer/name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'brewer/name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'shipping_partner/name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'shipment_id',
                },
            ],
        },
        Common.ValueListWithFixedValues : false,
        Common.Text : delivery.delivery_id,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};

annotate service.Partners with {
    ID @Common.ExternalID : partner_id
};

annotate service.ClaimDefects with {
    ID @Common.ExternalID : secondary_defect_code.name
};

annotate service.ClaimsToSecondaryDefectSearch with {
    claim_type @Common.Text : secondary_defect_name
};

annotate service.ClaimsToSecondaryDefectSearch with {
    secondary_defect_code @Common.Text : secondary_defect_name
};

annotate service.Attachments with {
    contentType @Common.FieldControl : #ReadOnly
};

annotate service.Attachments with {
    contentLength @(
        Common.FieldControl : #ReadOnly,
        Measures.Unit : 'KB',
    )
};

annotate service.Attachments with {
    contentLengthKB @(
        Common.FieldControl : #ReadOnly,
        Measures.Unit : 'KB',
    )
};

annotate service.Claims with {
    agent_approval_report @(
        UI.MultiLineText : true,
        Common.FieldControl : #ReadOnly,
    )
};

annotate service.Deliveries with {
    delivery_id @(
        Common.SemanticObject : 'delivery',
        Common.SemanticObjectMapping : [
            {
                $Type : 'Common.SemanticObjectMappingType',
                LocalProperty : delivery_id,
                SemanticObjectProperty : 'delivery_id',
            },
        ],
    )
};

annotate service.Deliveries with {
    ID @(
        Common.Text : delivery_id,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.SemanticObject : 'delivery',
        Common.SemanticObjectMapping : [
            {
                $Type : 'Common.SemanticObjectMappingType',
                LocalProperty : ID,
                SemanticObjectProperty : 'ID',
            },
        ],
    )
};

annotate service.Attachments with {
    type @(
        Common.Text : type.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.ValueListWithFixedValues : true,
)};

