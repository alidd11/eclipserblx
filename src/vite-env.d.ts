/// <reference types="vite/client" />

// Provide a minimal NodeJS namespace shim so browser timer types compile
// without pulling in the full @types/node package.
declare namespace NodeJS {
  type Timeout = ReturnType<typeof setTimeout>;
  type Timer = ReturnType<typeof setTimeout>;
}
