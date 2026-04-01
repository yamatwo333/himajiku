import LoginScreen from "@/components/login/LoginScreen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;

  return <LoginScreen redirectPath={redirect} errorCode={error} />;
}
