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
            Label : 'Attachments',
            ID : 'Attachment',
            Target : 'attachments/@UI.LineItem#Attachment',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Secondary Defects',
            ID : 'Defects',
            Target : 'defects/@UI.LineItem#Defects',
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
                Value : primary_defect_code_id,
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
);

annotate service.Claims with {
    total_claim_value @Measures.ISOCurrency : claim_currency_code
};

annotate service.Attachments with @(
    UI.LineItem #Attachment : [
        {
            $Type : 'UI.DataField',
            Value : claim.attachments.content,
            Label : 'File Name',
        },
        {
            $Type : 'UI.DataField',
            Value : createdAt,
        },
        {
            $Type : 'UI.DataField',
            Value : createdBy,
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
            CollectionPath : 'PrimaryDefectCodes',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : primary_defect_code_id,
                    ValueListProperty : 'id',
                },
            ],
            Label : 'Defect Code',
            PresentationVariantQualifier : 'vh_Claims_primary_defect_code',
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

