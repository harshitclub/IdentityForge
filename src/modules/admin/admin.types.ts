import type { AccountStatus, UserRole } from "../../generated/prisma/enums.js";

export type PaginationDto = {
  page: number;
  limit: number;
};

export type UpdateUserRoleDto = {
  role: UserRole;
};

export type UpdateUserStatusDto = {
  status: AccountStatus;
};
