export type SignupDto = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type SessionMetadata = {
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
};

export type ForgotPasswordDto = {
  email: string;
};

export type ResetPasswordDto = {
  newPassword: string;
};

export type ChangePasswordDto = {
  currentPassword: string;
  newPassword: string;
};
