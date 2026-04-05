import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const verifyPasswordAgainstUser = async (user, candidatePassword) => {
  const candidate = String(candidatePassword || "");

  if (!candidate) {
    return false;
  }

  if (user?.passwordHash) {
    return bcrypt.compare(candidate, user.passwordHash);
  }

  if (user?.password) {
    return String(user.password) === candidate;
  }

  return false;
};

export const hashPassword = async (plainPassword) => bcrypt.hash(String(plainPassword || ""), SALT_ROUNDS);
