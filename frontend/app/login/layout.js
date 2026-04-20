import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Login",
  description: "Login to your GreenCRM workspace and continue with leads, customers, tasks, and workflow operations.",
  path: "/login",
  index: false,
});

export default function LoginLayout({ children }) {
  return children;
}
