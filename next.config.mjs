/** @type {import('next').NextConfig} */
const nextConfig = {
  // The optional `openai` provider is loaded via a runtime `import()` that is
  // hidden from static analysis (see src/core/providers/openai.ts), so the
  // bundler never tries to resolve it unless it's installed and selected.
  // No extra config needed.
};

export default nextConfig;
