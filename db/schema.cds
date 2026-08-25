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




// Deliveries
@Common.Label: 'Delivery'
entity Deliveries : managed, cuid {
  delivery_id                    : String(10)            @Common.Label: 'Delivery Id'; 
  customer_id                    : String(10)            @Common.Label: 'Customer Id'; 
  shipment_id                    : String(10)            @Common.Label: 'Shipment Id'; 
  customer_name                  : String(200)           @Common.Label: 'Customer Name'; 
  container_id                   : String(50)            @Common.Label: 'Container Id'; 
  origin_country                 : String(2)             @Common.Label: 'Origin Country'; 
  sales_region                   : String(4)             @Common.Label: 'Sales Region'; 
  sales_region_desc              : String(40)            @Common.Label: 'Sales Region Description'; 
  delivery_date                  : Date                  @Common.Label: 'Delivery Date'; 
  discharge_country              : String(2)             @Common.Label: 'Discharge Country';
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
  brewer_id                : String(10)     @Common.Label: 'Brewer Id';
  brewer_name              : String(50)     @Common.Label: 'Brewer Name';
  delivery_id              : String(40)     @Common.Label: 'Delivery Id';
  workflow_id              : UUID           @Common.Label: 'Workflow Id';
  arrival_date             : Date           @Common.Label: 'Actual Arrival Date';
  virtual days_from_arrival: Integer        @Common.Label: 'Days from Arrival';
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

  delivery                 : Association to one Deliveries
                               on delivery.delivery_id = $self.delivery_id;

  pallets                  : Composition of many ClaimPallets
                               on pallets.claim = $self;

  defects                  : Composition of many ClaimDefects
                               on defects.claim = $self;
          
  primary_defect_code      : Association to one PrimaryDefectCodes           @Common.Label: 'Primary Defect Code'  @Common.Text  : primary_defect_code.name;
  market_representative    : Association to one MarketRep                    @Common.Label: 'Market Representative'  @Common.Text: market_representative.email;
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


@Common.Label: 'Quality Claim'
entity QualityClaims : managed {

  key claim                           : Association to one Claims;
      is_pool                         : Boolean        @Common.Label: 'Is Pool';
      virtual claim_value_per_tce     : Decimal(15, 2) @Common.Label: 'Claim Value per TCE';
      qc_inspection_date              : Date           @Common.Label: 'QC Inspection Date';
      virtual percentage_claimed      : Decimal(15, 2) @Common.Label: 'Percentage Claimed';
      number_of_tce_out_of_spec       : Integer        @Common.Label: 'Number of TCE Out of Spec';
}


@Common.Label: 'Packaging Claim'
entity PackagingClaims : managed {
  key claim           : Association to one Claims;
      pack_house_id   : String(10) @Common.Label: 'Pack House Id';
      pack_house_name : String(50) @Common.Label: 'Pack House Name';
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
  rpin         : String(10) @Common.Label: 'RPIN';
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


@Common.Label: 'Market Representatives'
entity MarketRep : cuid, managed {
  email     : String(254)  @Common.Label: 'Email'  @Communication.IsEmailAddress: true;
  firstName : String(40)   @Common.Label: 'First Name';
  lastName  : String(40)   @Common.Label: 'Last Name';
  active    : Boolean      @Common.Label: 'Active';
}
