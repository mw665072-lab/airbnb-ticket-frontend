# API Integration Matrix

Base URL: `VITE_API_URL` (default `http://localhost:5000/api/v1`)

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh` (Axios interceptor)
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/verify-email`
- `POST /auth/logout`

## Public flight and contact flows

- `POST /flights/search`
- `GET /routes/popular`
- `GET /airports`
- `POST /enquiries`

## Customer booking requests

- `POST /booking-requests` with `Idempotency-Key`
- `GET /booking-requests/my`
- `GET /booking-requests/:reference`
- `PATCH /booking-requests/:reference/cancel`
- `POST /booking-requests/:reference/change-request`
- `GET /booking-requests/:reference/messages`
- `POST /booking-requests/:reference/messages`

## Payments

- `GET /payments/methods`
- `POST /payments/create` with `Idempotency-Key`
- `GET /payments/:reference` with polling while pending/processing
- Stripe Elements confirmation using the backend-provided client secret and publishable key
- PayPal/regional hosted checkout redirects using the backend-provided checkout URL

## Admin operations

- `GET /admin/dashboard`
- `GET /admin/booking-requests`
- `GET /admin/booking-requests/:reference`
- `PATCH /admin/booking-requests/:reference/status`
- `POST /admin/booking-requests/:reference/quote`
- `GET /admin/booking-requests/:reference/messages`
- `POST /admin/booking-requests/:reference/messages`
- `GET /admin/messages/unread`
- `POST /admin/booking-requests/:reference/book` with `Idempotency-Key`
- `GET /admin/bookings`
- `GET /admin/bookings/:reference`
- `PATCH /admin/bookings/:reference`
- `PATCH /admin/bookings/:reference/cancel`
- `POST /admin/bookings/:reference/documents` (multipart PDF)
- `GET /admin/customers`
- `GET /admin/customers/:id`
- `GET /admin/enquiries`
- `PATCH /admin/enquiries/:id`
- `POST /admin/enquiries/:id/reply`
- `GET /admin/exports/bookings`
- `GET /admin/exports/requests`
- `GET /admin/exports/payments`
- `POST /admin/payments/:reference/refund`
- `POST /admin/users`
- `GET /admin/users`
- `PATCH /admin/users/:id`

## Intentionally not called by browser code

- `/payments/webhooks/stripe`
- `/payments/webhooks/paypal`
- `/payments/webhooks/regional`

These are provider-to-server endpoints. Calling them from the frontend would expose or bypass signature verification and is not production-safe.
