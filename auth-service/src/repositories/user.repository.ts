import {
  findUserByEmail as findUserByEmailInStore,
  findUserById as findUserByIdInStore,
  insertUser,
  type UserRecord
} from "../database";
import { User } from "../models/user.model";

function mapUserRecord(user: UserRecord | null): User | null {
  if (!user) {
    return null;
  }

  return { ...user };
}

export function createUser(user: User): User {
  insertUser(user);
  return user;
}

export function findUserByEmail(email: string): User | null {
  return mapUserRecord(findUserByEmailInStore(email));
}

export function findUserById(id: string): User | null {
  return mapUserRecord(findUserByIdInStore(id));
}
