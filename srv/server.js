// const helmet = require("helmet");
import helmet from "helmet";

cds.on("bootstrap", async (app) => {
  // Reduce finger printing
  app.disable("x-powered-by");

  // Ping health service
  app.get("/ping", (_, res) => {
    res.status(200).send("OK");
  });


});

if (process.env.NODE_ENV !== 'production') {
  const cds_swagger = await import('cds-swagger-ui-express');
  cds.on('bootstrap', app => app.use(cds_swagger.default()));
}


export default cds.server;