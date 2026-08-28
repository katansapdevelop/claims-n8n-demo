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
