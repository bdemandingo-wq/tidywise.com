import { readFileSync, writeFileSync, statSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

// Handle ESM/CJS interop for @babel/traverse
const traverse = (typeof _traverse === "function" ? _traverse : (_traverse as any).default) as typeof _traverse;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "../..");

// ======== CONFIGURATION ========
const BASE_URL = "https://www.tidywisecleaning.com";
const ROUTER_FILE_PATH = resolve(__dirname, "../App.tsx");
const OUTPUT_PATH = resolve(__dirname, "../../public/sitemap.xml");

// Routes to exclude from the sitemap (internal/auth pages)
const IGNORE_PATHS: string[] = [
  "/auth",
  "/admin",
  "/my-bookings",
  "/confirmation",
  "/booking",
  "*",
];
// ================================

function generateSitemap() {
  const source = readFileSync(ROUTER_FILE_PATH, "utf-8");

  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const routes: string[] = [];

  traverse(ast, {
    JSXOpeningElement(path) {
      const nameNode = path.node.name;
      if (nameNode.type === "JSXIdentifier" && nameNode.name === "Route") {
        const pathAttr = path.node.attributes.find(
          (attr) =>
            attr.type === "JSXAttribute" &&
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "path"
        );

        if (
          pathAttr &&
          pathAttr.type === "JSXAttribute" &&
          pathAttr.value &&
          pathAttr.value.type === "StringLiteral"
        ) {
          const routePath = pathAttr.value.value;

          // Skip ignored paths, dynamic segments, and Navigate redirects
          if (
            IGNORE_PATHS.includes(routePath) ||
            routePath.includes(":") ||
            routePath.includes("*")
          ) {
            return;
          }

          // Check if this Route uses Navigate (redirect) — skip those
          const elementAttr = path.node.attributes.find(
            (attr) =>
              attr.type === "JSXAttribute" &&
              attr.name.type === "JSXIdentifier" &&
              attr.name.name === "element"
          );
          if (
            elementAttr &&
            elementAttr.type === "JSXAttribute" &&
            elementAttr.value &&
            elementAttr.value.type === "JSXExpressionContainer"
          ) {
            const expr = elementAttr.value.expression;
            if (
              expr.type === "JSXElement" &&
              expr.openingElement.name.type === "JSXIdentifier" &&
              expr.openingElement.name.name === "Navigate"
            ) {
              return;
            }
          }

          routes.push(routePath);
        }
      }
    },
  });

  // Assign priorities based on route depth/type
  function getPriority(route: string): string {
    if (route === "/") return "1.0";
    if (["/service-areas", "/standard-cleaning", "/deep-cleaning", "/move-in-out-cleaning", "/carpet-cleaning", "/upholstery-cleaning", "/airbnb-cleaning", "/office-cleaning", "/post-construction-cleaning"].includes(route)) return "0.9";
    if (route.match(/^\/(broward|miami-dade|palm-beach)-.*cleaning$/)) return "0.9";
    if (route === "/blog" || route === "/faq") return "0.8";
    if (route.startsWith("/blog/")) return "0.7";
    if (["/referral-program", "/apply"].includes(route)) return "0.6";
    if (route === "/sitemap") return "0.3";
    return "0.8";
  }

  function getChangefreq(route: string): string {
    if (route.startsWith("/blog/")) return "monthly";
    if (["/faq", "/referral-program", "/apply", "/sitemap", "/contractor-rate-sheet"].includes(route)) return "monthly";
    return "weekly";
  }

  const today = new Date().toISOString().split("T")[0];

  const urls = routes
    .map(
      (route) =>
        `  <url>\n    <loc>${BASE_URL}${route}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${getChangefreq(route)}</changefreq>\n    <priority>${getPriority(route)}</priority>\n  </url>`
    )
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  writeFileSync(OUTPUT_PATH, sitemap, "utf-8");
  console.log(`✅ Sitemap generated with ${routes.length} URLs → ${OUTPUT_PATH}`);
}

generateSitemap();
