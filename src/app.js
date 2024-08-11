const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const { getProfile } = require("./middleware/getProfile");
const app = express();
app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

const contractsController = require("./controllers/contractsController");
const jobsController = require("./controllers/jobsController");
const balancesController = require("./controllers/balancesController");
const adminController = require("./controllers/adminController");

// Contracts
app.get("/contracts", getProfile, contractsController.getAllContracts);
app.get("/contracts/:id", getProfile, contractsController.getContractById);

// Jobs
app.get("/jobs/unpaid", getProfile, jobsController.getUnpaidJobs);
app.post("/jobs/:job_id/pay", getProfile, jobsController.payForJob);

// Balances
app.post(
  "/balances/deposit/:userId",
  getProfile,
  balancesController.depositToBalance
);

// Admin
app.get("/admin/best-profession", adminController.getBestProfession);
app.get("/admin/best-clients", adminController.getBestClients);

module.exports = app;
