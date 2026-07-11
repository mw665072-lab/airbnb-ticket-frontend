# Frontend Architecture

## Server state

TanStack React Query owns all remote data. Query keys are centralized in `src/query/keys.ts`, API hooks live in `src/query/hooks.ts`, and every mutation invalidates the smallest affected cache scope.

## HTTP and authentication

`src/api/client.ts` creates one Axios client with:

- `VITE_API_URL` base URL
- `withCredentials: true` for the refresh-token cookie
- bearer access-token injection
- a unique `X-Request-Id` per request
- one shared refresh promise so simultaneous `401` responses do not create a refresh storm
- one retry of the original request after refresh
- normalized `ApiError` objects for UI-safe error handling

The short-lived access token and current user are persisted only in `sessionStorage`. The refresh token remains an httpOnly cookie controlled by the backend.

## Local state

Zustand is limited to:

- authenticated user/access token
- toast notifications
- the selected flight/booking draft in session storage

No route, customer, booking, enquiry, weather, payment, or admin business data is mocked or stored as frontend source of truth.

## Performance

- Admin pages are route-level lazy chunks.
- Stripe Payment Element is loaded only when a Stripe payment is created.
- Airport input uses deferred values and React Query request cancellation.
- Independent server state is queried separately to avoid blocking unrelated UI.
- Direct module imports are used instead of application barrel files.

## Security notes

- Frontend role guards improve UX but do not replace backend authorization.
- Idempotency keys are generated for booking request, payment, and admin booking creation.
- Webhook endpoints are not called from the browser. Stripe, PayPal, and regional providers must call those backend routes directly with provider signatures.
- Passport and passenger data is sent only to the backend and is never persisted in local storage.
