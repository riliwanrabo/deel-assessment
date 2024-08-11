const { Sequelize } = require("sequelize");

exports.getAllContracts = async (req, res) => {
  const { Contract } = req.app.get("models");
  const profileId = req.profile?.id;

  const contracts = await Contract.findAll({
    where: {
      status: { [Sequelize.Op.not]: "terminated" },
      [Sequelize.Op.or]: [{ ContractorId: profileId }, { ClientId: profileId }],
    },
  });

  res.json(contracts);
};

exports.getContractById = async (req, res) => {
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
};
