const cds = require("@sap/cds");
const credentials = {
  admin: { user: "admin", password: "admin" },
  reviewer: { user: "reviewer", password: "reviewer" },
  operator: { user: "operator", password: "operator" },
  finance: { user: "finance", password: "finance" },
};

function setCredentials(userType, axios) {
  axios.defaults.auth = {
    username: credentials[userType].user,
    password: credentials[userType].password,
  };
}

describe("Basic Claims Service Tests", function () {
  this.timeout(5000); // Increase timeout for slow network connections

  const { GET, expect, axios } = cds.test(__dirname + "/../", "--with-mocks");

  context("when running as an operator", function () {
    setCredentials("operator", axios);
    it("should return all claims", async function () {
      const response = await GET`/app/claim/Claims`;
      expect(response.data).to.be.an("object");
      expect(response.data.value).to.be.an("array");
      expect(response.data.value).to.have.lengthOf(5);
    });

    it("should return a single claim", async function () {
      const response =
        await GET`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)`;
      expect(response.data).to.be.an("object");
      expect(response.data.ID).to.equal("3b241101-e2bb-4255-8caf-4136c566a979");
    });
  });
});

describe("Run Tests for Quality Claim Status Progression from new to complete", function () {
  this.timeout(5000); // Increase timeout for slow network connections

  const { POST, expect, axios } = cds.test(__dirname + "/../", "--with-mocks");
  axios.defaults.auth = {
    username: credentials.admin.user,
    password: credentials.admin.password,
  };

  it("should set the status from new to pending review", async function () {
    const response =
      await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)/ClaimAppService.submitForReview`;
    expect(response.status).to.equal(204);
    expect(response.headers["sap-messages"]).to.be.an("string");
    expect(JSON.parse(response.headers["sap-messages"])[0].message).to.equal(
      "The claim has been submitted for review"
    );
  });
});

/*
describe("Run Tests for Quality Claim Status Progression from new to complete", () => {
  

  const { POST, GET, expect, axios } = cds.test(__dirname + "/../", "--with-mocks");
  axios.defaults.auth = {
    username: credentials.operator.user,
    password: credentials.operator.password,
  };

  it("should set the status from new to pending review ", async () => {
    this.timeout(10000); // Increase timeout for slow network connections

    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)/ClaimAppService.submitForReview`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim has been submitted for review");

  });

  it("should set the status from pending review to request info", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)/ClaimAppService.requestInfo`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("An e-mail has been sent to the claimant to request further information to support the claim");

  });

  it("should set the status from request info to pending review ", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)/ClaimAppService.submitForReview`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim has been submitted for review");

  });

  it("should set the status from request info to review approved", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)/ClaimAppService.submitReviewApprove`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim review has been approved");

  });

  it("should set the status from review approved to sent to grower", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)/ClaimAppService.submitSendToGrower`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim has been sent to the grower for review");

  });


  it("should set the status from sent to grower to with finance", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)/ClaimAppService.submitGrowerAccepted`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim has been approved by the grower & is with finance to complete");

  });

  it("should set the status from with finance to complete", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a979,IsActiveEntity=true)/ClaimAppService.submitFinanceComplete`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim is now complete");

  });
});


describe("Run Tests for Claim Status Progression from new to complete", () => {
  const { POST, GET, expect, axios } = cds.test(__dirname + "/../", "--with-mocks");
  const claimId = '3b241101-e2bb-4255-8caf-4136c566a980';
  axios.defaults.auth = {
    username: credentials.operator.user,
    password: credentials.operator.password,
  };

  it("should set the status from new to pending review ", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a980,IsActiveEntity=true)/ClaimAppService.submitForReview`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim has been submitted for review");

  });

  it("should set the status from pending review to request info", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a980,IsActiveEntity=true)/ClaimAppService.requestInfo`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("An e-mail has been sent to the claimant to request further information to support the claim");

  });

  it("should set the status from request info to pending review ", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a980,IsActiveEntity=true)/ClaimAppService.submitForReview`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim has been submitted for review");

  });

  it("should set the status from request info to review approved", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a980,IsActiveEntity=true)/ClaimAppService.submitReviewApprove`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim review has been approved");

  });

  it("should set the status from with finance to complete", async () => {
    const response = await POST`/app/claim/Claims(ID=3b241101-e2bb-4255-8caf-4136c566a980,IsActiveEntity=true)/ClaimAppService.submitFinanceComplete`;
    expect(response.status).to.equal(204);
    expect(response.headers['sap-messages']).to.be.an("string");
    expect(JSON.parse(response.headers['sap-messages'])[0].message).to.equal("The claim is now complete");

  });
});
*/
