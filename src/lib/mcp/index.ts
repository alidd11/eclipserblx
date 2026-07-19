import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import searchProductsTool from "./tools/search-products";
import getMyOrdersTool from "./tools/get-my-orders";
import getMyWishlistTool from "./tools/get-my-wishlist";

// Build the OAuth issuer from the project ref (Vite inlines this literal at
// build time, keeping the entry import-safe — no runtime env read). The
// fallback keeps the issuer well-formed during the manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "eclipse-mcp",
  title: "Eclipse Marketplace",
  version: "0.1.0",
  instructions:
    "Tools for the Eclipse Roblox marketplace. Use `search_products` to browse the public catalog; `whoami`, `get_my_orders` and `get_my_wishlist` act as the signed-in Eclipse user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, searchProductsTool, getMyOrdersTool, getMyWishlistTool],
});
