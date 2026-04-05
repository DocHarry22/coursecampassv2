import {
  dataAffiliateStat,
  dataOverallStat,
  dataProduct,
  dataProductStat,
  dataTransaction,
  dataUser,
} from "../data/index.js";

export const isDatabaseConnected = (req) => req.app.locals.dbStatus === "connected";

export const getFallbackInventory = () => ({
  users: dataUser.length,
  products: dataProduct.length,
  transactions: dataTransaction.length,
  affiliateStats: dataAffiliateStat.length,
  overallStats: dataOverallStat.length,
});

export const getFallbackDashboardMetrics = () => ({
  users: dataUser.length,
  products: dataProduct.length,
  transactions: dataTransaction.length,
  revenue: dataTransaction.reduce((total, transaction) => total + Number(transaction.cost || 0), 0),
});

export const getFallbackTransactions = () => {
  const usersById = new Map(dataUser.map((user) => [user._id, user]));

  return [...dataTransaction]
    .slice(-12)
    .reverse()
    .map((transaction) => {
      const user = usersById.get(transaction.userId);

      return {
        ...transaction,
        userId: user
          ? {
              _id: user._id,
              name: user.name,
              email: user.email,
              country: user.country,
            }
          : null,
      };
    });
};

export const getFallbackCustomers = () =>
  [...dataUser]
    .map(({ password, ...user }) => user)
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 20);

export const getFallbackProducts = () =>
  [...dataProduct].sort((left, right) => left.name.localeCompare(right.name)).slice(0, 20);

export const getFallbackSalesOverview = () => ({
  overallStat: dataOverallStat[0] ?? null,
  productStatsCount: dataProductStat.length,
  affiliateStatsCount: dataAffiliateStat.length,
});