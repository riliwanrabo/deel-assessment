const { Sequelize } = require("sequelize");

exports.depositToBalance = async (req, res) => {
  const { Job, Contract } = res.app.get("models");
  const sequelize = req.app.get("sequelize");
  const { userId } = req.params;
  const { amount } = req.body;

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
};
