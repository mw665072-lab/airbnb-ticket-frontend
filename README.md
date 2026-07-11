# Airline Booking Frontend

Production-oriented React 19 + Vite frontend for the Airline Ticket Booking Backend API v1.1.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS 4
- TanStack React Query for server state
- Axios client with bearer-token injection, request IDs, refresh-token rotation, queued 401 retries, and normalized API errors
- React Router with protected customer/admin routes and lazy-loaded admin modules
- React Hook Form + Zod validation
- Stripe Payment Element support plus redirect checkout for PayPal/regional gateways
- Zustand only for small session/UI state; no seeded business data or fake API behavior

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

The backend must allow credentials from the frontend origin because refresh tokens are sent through an httpOnly cookie.

## Production checklist

1. Set `VITE_API_URL` to the HTTPS API URL ending in `/api/v1`.
2. Set `VITE_APP_URL` to the deployed frontend URL.
3. Configure backend CORS with the exact frontend origin and `credentials: true`.
4. Keep refresh tokens in secure httpOnly cookies. The frontend stores only the short-lived access token in session storage.
5. Build with `npm run build` and serve the generated `dist/` directory behind HTTPS.
# airbnb-ticket-frontend
