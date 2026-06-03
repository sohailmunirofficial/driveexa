import { Redirect } from "expo-router";
import { useAuth } from "../context/auth";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return <Redirect href={user ? "/home" : "/auth/login"} />;
}
