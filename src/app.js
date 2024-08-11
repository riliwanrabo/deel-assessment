const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const { getProfile } = require("./middleware/getProfile");
const { Sequelize, or } = require("sequelize");
const app = express();
app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

app.get("/contracts", getProfile, async (req, res) => {
  const { Contract } = req.app.get("models");
  const profileId = req.profile?.id;

  const contracts = await Contract.findAll({
    where: {
      status: { [Sequelize.Op.not]: "terminated" },
      [Sequelize.Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
    },
  });

  res.json(contracts);
});

/**
 * FIX ME!
 * @returns contract by id
 */
app.get("/contracts/:id", getProfile, async (req, res) => {
  const { Contract } = req.app.get("models");
  const { id } = req.params;

  const profileId = req.profile?.id;

  const contract = await Contract.findOne({
    where: {
      id,
      [Sequelize.Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
    },
  });

  if (!contract) return res.status(404).end();
  res.json(contract);
});
module.exports = app;
