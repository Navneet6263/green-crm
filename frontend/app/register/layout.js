import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "Create Workspace",
  description: "Create your GreenCRM workspace, set up the first admin, and start managing leads, customers, and teams.",
  path: "/register",
  index: false,
});

export default function RegisterLayout({ children }) {
  return children;
}
