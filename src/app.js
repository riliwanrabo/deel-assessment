const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./model");
const { getProfile } = require("./middleware/getProfile");
const { Sequelize, or } = require("sequelize");
const app = express();
app.use(bodyParser.json());
app.set("sequelize", sequelize);
app.set("models", sequelize.models);

// all profile's contracts
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

// jobs

// 1. **_GET_** `/jobs/unpaid` - Get all unpaid jobs for a user (**_either_** a client or contractor), for **_active contracts only_**.
app.get("/jobs/unpaid", getProfile, async (req, res) => {
  const { Contract, Job } = req.app.get("models");
  const profileId = req.profile?.id;

  const jobs = await Job.findAll({
    where: {
      paid: {
        [Sequelize.Op.not]: true,
      },
    },
    include: [
      {
        model: Contract,
        where: {
          status: "in_progress",
          [Sequelize.Op.or]: [
            { ContractorId: profileId },
            { ClientId: profileId },
          ],
        },
      },
    ],
  });

  res.json(jobs);
});

// 1. **_POST_** `/jobs/:job_id/pay` - Pay for a job, a client can only pay if his balance >= the amount to pay. The amount should be moved
app.post("/jobs/:job_id/pay", getProfile, async (req, res) => {
  const { Contract, Job, Profile } = req.app.get("models");
  const { job_id } = req.params;
  const profileId = req.profile?.id;

  const job = await Job.findOne({
    where: { id: job_id },
    include: {
      model: Contract,
      where: { ClientId: profileId },
    },
  });

  if (!job) return res.status(404).end();
  if (job.paid) return res.status(400).json({ message: "Job already paid" });

  const client = await Profile.findOne({ where: { id: profileId } });
  const contractor = await Profile.findOne({
    where: { id: job.Contract.ContractorId },
  });

  if (client.balance < job.price)
    return res.status(400).json({ message: "Insufficient balance" });

  await sequelize.transaction(async (transaction) => {
    // u[pdate client balance
    await client.update(
      { balance: client.balance - job.price },
      { transaction }
    );

    // update contractor's balance
    await contractor.update(
      { balance: contractor.balance + job.price },
      { transaction }
    );
    await job.update({ paid: true, paymentDate: new Date() }, { transaction });
  });

  res.json({ message: "Payment successful" });
});

// 1. **_POST_** `/balances/deposit/:userId` - Deposits money into the the the balance of a client, a client can't deposit more than 25% his total of jobs to pay. (at the deposit moment)
app.post("/balances/deposit/:userId", getProfile, async (req, res) => {
  const { Profile, Job, Contract } = res.app.get("models");
  const { userId } = req.params;
  const { amount } = req.body;

  // get total unpaid
  const totalUnpaid = await Job.sum("price", {
    where: {
      paid: {
        [Sequelize.Op.not]: true,
      },
    },
    include: {
      model: Contract,
      where: {
        ClientId: userId,
        status: "in_progress",
      },
    },
  });

  console.log("totalunpaid", totalUnpaid);

  const cappedDeposit = totalUnpaid * 0.25;

  if (amount > cappedDeposit)
    return res
      .status(400)
      .json({ message: `Maximum deposit is ${cappedDeposit}` });

  await sequelize.transaction(async (transaction) => {
    await req.profile.update(
      { balance: req.profile.balance + amount },
      { transaction }
    );
  });

  res.json({ message: "Deposit successful" });
});
