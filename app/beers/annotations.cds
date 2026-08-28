using BeerAppService as service from '../../srv/beers-app-service';
annotate service.Beers with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : beer_id,
            },
            {
                $Type : 'UI.DataField',
                Value : name,
            },
            {
                $Type : 'UI.DataField',
                Value : abv,
                Label : 'Alcohol by Volume %',
            },
            {
                $Type : 'UI.DataField',
                Value : description,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Brewery',
            ID : 'Brewer',
            Target : '@UI.FieldGroup#Brewer',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : beer_id,
        },
        {
            $Type : 'UI.DataField',
            Value : name,
        },
        {
            $Type : 'UI.DataField',
            Value : description,
        },
        {
            $Type : 'UI.DataField',
            Value : abv,
        },
        {
            $Type : 'UI.DataField',
            Value : brewer.name,
            Label : 'Brewer',
        },
        {
            $Type : 'UI.DataField',
            Value : brewer.partner_id,
        },
    ],
    UI.SelectionFields : [
        brewer.partner_id,
        brewer.name,
    ],
    UI.HeaderInfo : {
        Title : {
            $Type : 'UI.DataField',
            Value : beer_id,
        },
        TypeName : '',
        TypeNamePlural : '',
        Description : {
            $Type : 'UI.DataField',
            Value : name,
        },
    },
    UI.FieldGroup #Brewer : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : brewer_ID,
                Label : 'ID',
            },
            {
                $Type : 'UI.DataField',
                Value : brewer.name,
            },
            {
                $Type : 'UI.DataField',
                Value : brewer.contact_person_name,
            },
            {
                $Type : 'UI.DataField',
                Value : brewer.contact_number,
            },
            {
                $Type : 'UI.DataField',
                Value : brewer.email_address,
            },
        ],
    },
);

annotate service.Beers with {
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
            Label : 'Brewery Search',
        },
        Common.ValueListWithFixedValues : false,
        Common.Text : brewer.partner_id,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};

annotate service.Partners with {
    partner_id @Common.Label : 'Brewer Id'
};

annotate service.Partners with {
    name @Common.Label : 'Brewer'
};

annotate service.Beers with {
    description @UI.MultiLineText : true
};

annotate service.Partners with {
    ID @Common.ExternalID : partner_id
};

annotate service.BrewerySearch with @(
    UI.PresentationVariant #vh_Beers_brewer : {
        $Type : 'UI.PresentationVariantType',
        SortOrder : [
            {
                $Type : 'Common.SortOrderType',
                Property : partner_id,
                Descending : false,
            },
        ],
    }
);

annotate service.BrewerySearch with {
    ID @(
        Common.Text : partner_id,
        Common.Text.@UI.TextArrangement : #TextOnly,
)};

