using DeliveryAppService as service from '../../srv/delivery-app-service';
annotate service.Deliveries with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : delivery_id,
            },
            {
                $Type : 'UI.DataField',
                Value : shipment_id,
            },
            {
                $Type : 'UI.DataField',
                Value : delivery_date,
            },
            {
                $Type : 'UI.DataField',
                Value : brewer_ID,
            },
            {
                $Type : 'UI.DataField',
                Value : customer_ID,
            },
            {
                $Type : 'UI.DataField',
                Value : shipping_partner_ID,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Pallets',
            ID : 'Pallets',
            Target : 'pallets/@UI.LineItem#Pallets',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : delivery_id,
        },
        {
            $Type : 'UI.DataField',
            Value : shipment_id,
        },
        {
            $Type : 'UI.DataField',
            Value : delivery_date,
        },
        {
            $Type : 'UI.DataField',
            Value : brewer.name,
            Label : 'Brewery',
        },
        {
            $Type : 'UI.DataField',
            Value : customer.name,
            Label : 'Customer',
        },
        {
            $Type : 'UI.DataField',
            Value : shipping_partner.name,
            Label : 'Shipping Company',
        },
    ],
    UI.HeaderInfo : {
        Title : {
            $Type : 'UI.DataField',
            Value : delivery_id,
        },
        TypeName : '',
        TypeNamePlural : '',
    },
    UI.FieldGroup #ImpactedPallets : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : pallets.ID,
                Label : 'ID',
            },
        ],
    },
);

annotate service.Deliveries with {
    customer @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'CustomerSearch',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : customer_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'street_address',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'city',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'postal_code',
                },
            ],
            Label : 'Customer Search',
        },
        Common.Text : customer.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.ValueListWithFixedValues : false,
        Common.FieldControl : #Mandatory,
    )
};

annotate service.Deliveries with {
    shipping_partner @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'ShipperSearch',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : shipping_partner_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'street_address',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'city',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'postal_code',
                },
            ],
            Label : 'Shipping Company Search',
        },
        Common.Text : shipping_partner.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.ValueListWithFixedValues : false,
        Common.FieldControl : #Mandatory,
    )
};

annotate service.Deliveries with {
    brewer @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'BrewerySearch',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : brewer_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'name',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'street_address',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'city',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'postal_code',
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'country',
                },
            ],
            Label : 'Brewery Seach',
        },
        Common.Text : brewer.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.ValueListWithFixedValues : false,
        Common.FieldControl : #Mandatory,
    )
};

annotate service.Pallets with {
    ID @(
        Common.Text : pallet_id,
        Common.ExternalID : pallet_id,
    )
};

annotate service.Pallets with @(
    UI.LineItem #Pallets : [
        {
            $Type : 'UI.DataField',
            Value : ID,
            Label : 'ID',
        },
        {
            $Type : 'UI.DataField',
            Value : beer_ID,
        },
        {
            $Type : 'UI.DataField',
            Value : quantity,
        },
    ]
);

annotate service.Pallets with {
    quantity @Measures.Unit : uom_id
};

annotate service.BrewerySearch with {
    ID @(
        Common.Text : partner_id,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};

annotate service.CustomerSearch with {
    ID @(
        Common.Text : partner_id,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.ShipperSearch with {
    ID @(
        Common.Text : partner_id,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

annotate service.Pallets with {
    beer @(
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Beer',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : beer_ID,
                    ValueListProperty : 'ID',
                },
                {
                    $Type : 'Common.ValueListParameterIn',
                    ValueListProperty : 'brewer_ID',
                    LocalDataProperty : delivery.brewer_ID,
                },
                {
                    $Type : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'description',
                },
            ],
        },
        Common.ValueListWithFixedValues : false,
        Common.SemanticObject : 'beer',
        Common.Text : beer.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
        Common.SemanticObjectMapping : [
            {
                $Type : 'Common.SemanticObjectMappingType',
                LocalProperty : beer_ID,
                SemanticObjectProperty : 'ID',
            },
        ],
    )
};

annotate service.Beer with {
    beer_id @Common.Text : name
};

annotate service.Deliveries with {
    delivery_id @Common.FieldControl : #Mandatory
};

annotate service.Deliveries with {
    delivery_date @Common.FieldControl : #Mandatory
};

