const { Sequelize } = require("sequelize");

exports.getUnpaidJobs = async (req, res) => {
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
};

exports.payForJob = async (req, res) => {
  const { Contract, Job, Profile } = req.app.get("models");
  const sequelize = req.app.get("sequelize");
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
    await client.update(
      { balance: client.balance - job.price },
      { transaction }
    );

    await contractor.update(
      { balance: contractor.balance + job.price },
      { transaction }
    );

    await job.update({ paid: true, paymentDate: new Date() }, { transaction });
  });

  res.json({ message: "Payment successful" });
};
