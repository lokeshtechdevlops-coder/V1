# CareNexus frontend

React, TypeScript, Vite, Tailwind CSS and shadcn-style Radix UI components.
The entry point is `src/main.tsx`. `src/App.tsx` uses React Router to render
`src/HospitalApp.tsx` at `/` and `src/components/SignupForm.tsx` at `/signup`.
Original prototype screens are retained as references; the active application
does not import their mock data or simulated authentication.

Run `npm install`, then `npm run dev`. The backend must be running at
`http://localhost:8000`; see [project setup](../README.md).
Set `VITE_API_URL` in `.env.local` to change the API address.
Use the same hostname for both services, e.g. `localhost`.
NVIDIA credentials belong only in `backend/.env`.

Use Node.js 20.19+ or 22.12+.

`npm run build` checks TypeScript and builds production assets into `dist/`;
`npm run start` (or `npm run preview`) previews them at http://localhost:3000.
For production, serve `dist/` with a static host configured to fall back to
`index.html` for application routes, including `/signup`.
`npm run lint` checks TypeScript. `npm run test:e2e` tests already-running
frontend and seeded offline-demo API services.
