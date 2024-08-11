const { Sequelize } = require("sequelize");

exports.getBestProfession = async (req, res) => {
  const { start, end } = req.query;
  const { Profile } = req.app.get("models");

  const bestProfession = await Profile.findOne({
    attributes: [
      "profession",
      [
        Sequelize.literal(`
          (SELECT SUM(j.price)
           FROM Jobs j
           INNER JOIN Contracts c ON c.id = j.ContractId
           WHERE c.ContractorId = Profile.id
             AND j.paid = 1
             AND j.paymentDate BETWEEN '${start}' AND '${end}'
          )
        `),
        "total_earned",
      ],
    ],
    group: ["profession"],
    order: [[Sequelize.literal("total_earned"), "DESC"]],
    having: Sequelize.literal("total_earned IS NOT NULL"),
  });

  if (!bestProfession) return res.status(404).end();
  res.json(bestProfession);
};

exports.getBestClients = async (req, res) => {
  const { start, end, limit = 2 } = req.query;
  const { Profile } = req.app.get("models");

  const bestClients = await Profile.findAll({
    attributes: [
      "id",
      [Sequelize.literal("CONCAT(firstName, ' ', lastName)"), "fullName"],
      [
        Sequelize.literal(`
          (SELECT SUM(j.price)
           FROM Jobs j
           INNER JOIN Contracts c ON c.id = j.ContractId
           WHERE c.ClientId = Profile.id
             AND j.paid = 1
             AND j.paymentDate BETWEEN '${start}' AND '${end}'
          )
        `),
        "paid",
      ],
    ],
    group: ["Profile.id"],
    order: [[Sequelize.literal("paid"), "DESC"]],
    limit: parseInt(limit),
    having: Sequelize.literal("paid IS NOT NULL"),
  });

  if (!bestClients.length) return res.status(404).end();
  res.json(bestClients);
};
