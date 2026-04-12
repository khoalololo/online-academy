export const validatePassword = (password) => {
  const minLength = 8;
  const maxLength = 72; // bcrypt silently truncates beyond 72 bytes — enforce this to prevent DoS
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);

  return (
    password.length >= minLength &&
    password.length <= maxLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
};