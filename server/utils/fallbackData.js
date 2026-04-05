import {
  dataAffiliateStat,
  dataOverallStat,
  dataProduct,
  dataProductStat,
  dataTransaction,
  dataUser,
} from "../data/index.js";

export const isDatabaseConnected = (req) => req.app.locals.dbStatus === "connected";

const compareValues = (left, right) => {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined) {
    return -1;
  }

  if (right === null || right === undefined) {
    return 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
};

const paginateRows = (rows, { limit, skip }) => rows.slice(skip, skip + limit);

const buildCostFilter = (minCost, maxCost) => {
  if (minCost === null && maxCost === null) {
    return () => true;
  }

  return (row) => {
    const value = Number(row.cost ?? 0);

    if (minCost !== null && value < minCost) {
      return false;
    }

    if (maxCost !== null && value > maxCost) {
      return false;
    }

    return true;
  };
};

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

export const getFallbackTransactions = (options = {}) => {
  const {
    limit = 12,
    skip = 0,
    sortField = "_id",
    sortOrder = -1,
    filters = {},
  } = options;

  const usersById = new Map(dataUser.map((user) => [user._id, user]));

  const hasFilters = Object.values(filters).some((value) => value !== null && value !== undefined && value !== "");
  const shouldUseLegacyDefault =
    !hasFilters && limit === 12 && skip === 0 && sortField === "_id" && Number(sortOrder) === -1;

  const mappedTransactions = [...dataTransaction].map((transaction) => {
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

  if (shouldUseLegacyDefault) {
    return mappedTransactions.slice(-12).reverse();
  }

  const costFilter = buildCostFilter(filters.minCost ?? null, filters.maxCost ?? null);

  const filtered = mappedTransactions.filter((transaction) => {
    if (filters.userId && String(transaction.userId?._id || "") !== String(filters.userId)) {
      return false;
    }

    return costFilter(transaction);
  });

  const sorted = [...filtered].sort((left, right) => {
    const comparison = compareValues(left[sortField], right[sortField]);
    return comparison * Number(sortOrder || 1);
  });

  return paginateRows(sorted, { limit, skip });
};

export const getFallbackCustomers = (options = {}) => {
  const {
    limit = 20,
    skip = 0,
    sortField = "name",
    sortOrder = 1,
    filters = {},
  } = options;

  const filtered = [...dataUser]
    .map(({ password, ...user }) => user)
    .filter((user) => {
      if (filters.country && user.country?.toLowerCase() !== filters.country.toLowerCase()) {
        return false;
      }

      if (filters.occupation && user.occupation?.toLowerCase() !== filters.occupation.toLowerCase()) {
        return false;
      }

      if (filters.role && user.role?.toLowerCase() !== filters.role.toLowerCase()) {
        return false;
      }

      if (filters.search) {
        const needle = filters.search.toLowerCase();
        const haystack = `${user.name || ""} ${user.email || ""}`.toLowerCase();
        return haystack.includes(needle);
      }

      return true;
    });

  const sorted = filtered.sort((left, right) => {
    const comparison = compareValues(left[sortField], right[sortField]);
    return comparison * Number(sortOrder || 1);
  });

  return paginateRows(sorted, { limit, skip });
};

export const getFallbackProducts = (options = {}) => {
  const {
    limit = 20,
    skip = 0,
    sortField = "name",
    sortOrder = 1,
    filters = {},
  } = options;

  const filtered = [...dataProduct].filter((product) => {
    if (filters.category && product.category?.toLowerCase() !== filters.category.toLowerCase()) {
      return false;
    }

    if (filters.minPrice !== null && Number(product.price ?? 0) < Number(filters.minPrice)) {
      return false;
    }

    if (filters.maxPrice !== null && Number(product.price ?? 0) > Number(filters.maxPrice)) {
      return false;
    }

    if (filters.search) {
      const needle = filters.search.toLowerCase();
      const haystack = `${product.name || ""} ${product.description || ""}`.toLowerCase();
      return haystack.includes(needle);
    }

    return true;
  });

  const sorted = filtered.sort((left, right) => {
    const comparison = compareValues(left[sortField], right[sortField]);
    return comparison * Number(sortOrder || 1);
  });

  return paginateRows(sorted, { limit, skip });
};

export const getFallbackSalesOverview = () => ({
  overallStat: dataOverallStat[0] ?? null,
  productStatsCount: dataProductStat.length,
  affiliateStatsCount: dataAffiliateStat.length,
});
