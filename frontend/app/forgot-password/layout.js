import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Forgot Password",
  description: "Recover access to your GreenCRM account and reset your workspace password securely.",
  path: "/forgot-password",
  index: false,
});

export default function ForgotPasswordLayout({ children }) {
  return children;
}
