import { router } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearStoredAuthUserId,
  getStoredAuthUserId,
  setStoredAuthUserId,
} from "../services/auth-session";
import { initDatabase } from "../services/db";
import { User, UserRepository } from "../services/user-repository";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  validateRequiredText,
} from "../services/validation";

type AuthResult = {
  success: boolean;
  message?: string;
};

type AuthContextType = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  refreshUser: async () => {},
  isLoading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const storedUserId = await getStoredAuthUserId();
    if (!storedUserId) {
      setUser(null);
      return;
    }

    const refreshedUser = await UserRepository.getUserById(storedUserId);
    if (refreshedUser) {
      setUser(refreshedUser);
      return;
    }

    await clearStoredAuthUserId();
    setUser(null);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        await initDatabase();
        await refreshUser();
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, [refreshUser]);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    const emailError = validateEmail(email);
    if (emailError) {
      return { success: false, message: emailError };
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return { success: false, message: passwordError };
    }

    setIsLoading(true);
    try {
      const verifiedUser = await UserRepository.verifyCredentials(
        normalizeEmail(email),
        password,
      );
      if (verifiedUser) {
        await setStoredAuthUserId(verifiedUser.id);
        setUser(verifiedUser);
        router.replace("/home");
        return { success: true };
      }
      return { success: false, message: "Invalid email or password" };
    } catch (e) {
      console.error(e);
      return { success: false, message: "An unexpected error occurred" };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    name: string,
    email: string,
    phone: string,
    password: string,
  ): Promise<AuthResult> => {
    const nameError = validateRequiredText(name, "Full name");
    if (nameError) {
      return { success: false, message: nameError };
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return { success: false, message: emailError };
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return { success: false, message: passwordError };
    }

    setIsLoading(true);
    try {
      const userCount = await UserRepository.getUserCount();

      if (userCount > 0) {
        return {
          success: false,
          message: "An admin account already exists. Please login.",
        };
      }

      const newUser = await UserRepository.createUser({
        name: name.trim(),
        email: normalizeEmail(email),
        phone: phone.trim(),
        password,
      });
      if (newUser) {
        await setStoredAuthUserId(newUser.id);
        setUser(newUser);
        router.replace("/home");
        return { success: true };
      }
      return { success: false, message: "Failed to create account" };
    } catch (e) {
      console.error(e);
      return { success: false, message: "An unexpected error occurred" };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await clearStoredAuthUserId();
    setUser(null);
    router.replace("/auth/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, signIn, signUp, signOut, refreshUser, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
