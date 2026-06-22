const cds = require("@sap/cds");
const credentials = {
  admin: { user: "admin", password: "admin" },
  reviewer: { user: "reviewer", password: "reviewer" },
  operator: { user: "operator", password: "operator" },
  finance: { user: "finance", password: "finance" },
};

describe("Basic Delivery Service Tests", () => {
  const { GET, expect, axios } = cds.test(__dirname + "/../", "--with-mocks");
  axios.defaults.auth = {
    username: credentials.reviewer.user,
    password: credentials.reviewer.password,
  };

  it("should return all deliveries", async () => {
    const response = await GET`/app/delivery/DeliverySearch`;
    expect(response.data).to.be.an("object");
    expect(response.data.value).to.be.an("array");
    expect(response.data.value).to.have.lengthOf(6);
  });

  it("should return a single delivery", async () => {
    const response =
      await GET`/app/delivery/DeliverySearch('1980023157')`;
    expect(response.data).to.be.an("object");
    //expect(response.data.ID).to.equal("3b241101-e2bb-4255-8caf-4136c566a979");
  });

  ///app/delivery/DeliverySearch('1980023157')?$expand=appDelivery($select=ID,IsActiveEntity,market,market_representative_id)


});

