using {
  managed,
  cuid,
  Currency,
  sap.common.CodeList,
} from '@sap/cds/common';

namespace ls.claims;


@Common.Label: 'Claim Type'
entity ClaimType : CodeList {
  key id : String(2);
}

@Common.Label: 'Claim Status'
entity ClaimStatus : CodeList {
  key id          : Integer;
      criticality : Integer;
}

@Common.Label: 'Claim Action Type'
entity ClaimActionType : CodeList {
  key id : String(2);
}

@Common.Label: 'Cost Type'
entity CostType : CodeList {
  key id : Integer;
}


@Common.Label: 'Rejection Reason'
entity RejectionReason : CodeList {
  key id : String(2);
}

@Common.Label: 'Secondary Defect Codes Type'
entity SecondaryDefectCodes : CodeList {
  key id : String(5);
}

@Common.Label: 'Primary Defect Codes Type'
entity PrimaryDefectCodes : CodeList {
  key id : String(10);
}

@Common.Label: 'Partner Type'
entity PartnerType : CodeList {
  key id : String(2);
}


// Partners
@Common.Label: 'Partners'
entity Partners : managed, cuid {
  partner_id            : String(10)   @Common.Label: 'Partner Id'; 
  name                  : String(100)  @Common.Label: 'Partner Name';
  street_address        : String(100)  @Common.Label: 'Street Address';
  city                  : String(50)   @Common.Label: 'City';
  state_province        : String(50)   @Common.Label: 'State/Province';
  postal_code           : String(20)   @Common.Label: 'Postal Code';
  country               : String(50)   @Common.Label: 'Country';
  contact_person_name   : String(100)  @Common.Label: 'Contact Person Name';
  contact_number        : String(20)   @Common.Label: 'Contact Number';
  email_address         : String(254)  @Common.Label: 'Email Address'  @Communication.IsEmailAddress: true;
  // Associations
  type                  : Association to one PartnerType  @Common.Label: 'Partner Type'  @Common.Text: type.name;
}


// Deliveries
@Common.Label: 'Delivery'
entity Deliveries : managed, cuid {
  delivery_id                    : String(10)                  @Common.Label: 'Delivery Id';
  shipment_id                    : String(10)                  @Common.Label: 'Shipment Id'; 
  delivery_date                  : Date                        @Common.Label: 'Delivery Date'; 
  customer                       : Association to one Partners @Common.Label: 'Customer'  @Common.Text: customer.name;
  shipping_partner               : Association to one Partners @Common.Label: 'Shipping Partner'  @Common.Text: shipping_partner.name;
  brewer                         : Association to one Partners @Common.Label: 'Brewer'  @Common.Text: brewer.name;
}


// Claims
@Common.Label: 'Claims'
entity Claims : managed, cuid {
  claim_id                 : String(10)     @Common.Label: 'Claim Id';
  date_of_claim            : Date           @Common.Label: 'Date of Claim';
  description              : String(300)    @Common.Label: 'Description';
  total_claim_value        : Decimal(15, 2) @Common.Label: 'Total Claim Value' default 0;
  claim_value              : Decimal(15, 2) @Common.Label: 'Claim Value';
  claim_currency           : Currency       @Common.Label: 'Claim Currency'  @Common.IsCurrency;
  claim_date_week_number   : Integer        @Common.Label: 'Claim Date Week Number';
  days_to_claim            : Integer        @Common.Label: 'Days to Claim';
  credit_note_id           : String(10)     @Common.Label: 'Credit Note Id';
  payment_deduction_doc_id : String(10)     @Common.Label: 'Payment Deduction Doc Id';
  workflow_id              : UUID           @Common.Label: 'Workflow Id';
  arrival_date             : Date           @Common.Label: 'Actual Arrival Date';
  virtual days_from_arrival: Integer        @Common.Label: 'Days from Arrival';
  approval_acceptance_rate : Decimal(3,0)   @Common.Label: 'Approval Acceptance Rate';
  // Associations
  comments                 : Composition of many Comments
                               on comments.claim = $self;
  costs                    : Composition of many Costs
                               on costs.claim = $self;

  status                   : Association to one ClaimStatus                  @Common.Label: 'Status'  @Common.Text               : status.name;
  type                     : Association to one ClaimType                    @Common.Label: 'Claim Type'  @Common.Text           : type.name;
  RejectionReason          : Association to one RejectionReason              @Common.Label: 'Rejection Reason'  @Common.Text     : RejectionReason.name;




  attachments              : Composition of many Attachments
                               on attachments.claim = $self;

  auditLog                 : Composition of many AuditLogs
                               on auditLog.claim = $self;

  delivery                 : Association to one Deliveries                   @Common.Label: 'Delivery'  @Common.Text             : delivery.delivery_id;

  pallets                  : Composition of many ClaimPallets
                               on pallets.claim = $self;

  defects                  : Composition of many ClaimDefects
                               on defects.claim = $self;
          
  primary_defect_code      : Association to one PrimaryDefectCodes           @Common.Label: 'Primary Defect Code'  @Common.Text  : primary_defect_code.name;
}


@Common.Label: 'Comments'
entity Comments : managed, cuid {
  comment : String(300) @Common.Label: 'Comment';
  // Associations
  claim   : Association to one Claims;
}


@Common.Label: 'Additional Costs'
entity Costs : cuid, managed {
  value     : Decimal(15, 2) @Common.Label: 'Value';
  // Associations
  claim     : Association to one Claims;
  cost_type : Association to one CostType  @Common.Label: 'Cost Type'  @Common.Text: cost_type.name;
}

@Common.Label: 'Attachments'
entity Attachments : cuid, managed {
  name            : String(100)  @Common.Label : 'File Name';
  virtual content : LargeBinary  @Core.Computed: false  @Core.MediaType: contentType  @Core.ContentDisposition.Filename: name ;
  contentType     : String(20)   @Core.IsMediaType;
  objectId        : String(50)   @Common.Label : 'DMS Object Id';
  // Associations
  claim           : Association to one Claims;
}

@Common.Label: 'Audit Logs'
entity AuditLogs : cuid, managed {
  // Associations
  claimAction    : Association to one ClaimActionType  @Common.Label: 'Action'  @Common.Text         : claimAction.name;
  originalStatus : Association to one ClaimStatus      @Common.Label: 'Original Status'  @Common.Text: originalStatus.name;
  newStatus      : Association to one ClaimStatus      @Common.Label: 'New Status'  @Common.Text     : newStatus.name;
  claim          : Association to one Claims           @Common.Label: 'Claim Id'  @Common.Text       : claim.claim_id;
}

@Common.Label: 'Impacted Claim Pallets'
entity ClaimPallets : managed, cuid {
  pallet_id    : String(20) @Common.Label: 'Pallet Id';
  batch_id     : String(20) @Common.Label: 'Batch Id';
  storage_type : String(50) @Common.Label: 'Storage Type';
  pack_date    : Date       @Common.Label: 'Pack Date';
  pack_type    : String(50) @Common.Label: 'Pack Type';
  variety      : String(50) @Common.Label: 'Variety';
  region       : String(20) @Common.Label: 'Region';
  packer_name  : String(35) @Common.Label: 'Packer Name';
  size         : String(50) @Common.Label: 'Size';
  // Associations
  claim        : Association to one Claims;
}


entity ClaimDefects : managed, cuid {
  claim                 : Association to one Claims                @Common.Label: 'Claim Id'  @Common.Text             : claim.claim_id;
  secondary_defect_code : Association to one SecondaryDefectCodes  @Common.Label: 'Secondary Defect Code'  @Common.Text: secondary_defect_code.name;
}


@Common.Label: 'Defect to Claim Types Map'
entity DefectToClaimTypeMap {
  key claim_type          : Association to one ClaimType           @Common.Label: 'Claim Type'  @Common.Text         : claim_type.name;
  key primary_defect_code : Association to one PrimaryDefectCodes  @Common.Label: 'Primary Defect Code'  @Common.Text: primary_defect_code.name;
}

@Common.Label: 'Primary to Secondary Defect Map'
entity PrimaryToSecondaryDefectMap {
  key primary_defect_code   : Association to one PrimaryDefectCodes    @Common.Label: 'Primary Defect Code'  @Common.Text  : primary_defect_code.name;
  key secondary_defect_code : Association to one SecondaryDefectCodes  @Common.Label: 'Secondary Defect Code'  @Common.Text: secondary_defect_code.name;
}

