import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Reset Password",
  description: "Set a new GreenCRM password and return to your company workspace.",
  path: "/reset-password",
  index: false,
});

export default function ResetPasswordLayout({ children }) {
  return children;
}
