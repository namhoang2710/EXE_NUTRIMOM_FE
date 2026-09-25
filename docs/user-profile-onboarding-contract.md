# User profile and onboarding contract notes

The frontend uses `VITE_API_BASE_URL` (default `/api/v1`) and the existing Vite `/api` development proxy. All requests are relative to that base. The API client unwraps the backend `{ data, meta }` envelope and normalizes `{ error }` responses.

## Endpoints used

- `POST /auth/register`, `/auth/login`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout`
- `GET /auth/me` for identity and `GET /users/me` for the full profile
- `PATCH /users/me`, `DELETE /users/me`
- `GET/PATCH /users/me/preferences`
- `POST /pregnancies` with one of `estimated_due_date` or `last_menstrual_period`
- Existing Knowledge integration: `GET /knowledge/articles`, `GET /knowledge/articles/{slug}`, `PUT/DELETE /knowledge/articles/{slug}/bookmark`

## Mismatches and limits

- The pasted onboarding brief lists `/articles`, `/article-categories`, `/bookmarks/articles`, and `POST/DELETE /articles/{id}/bookmark`; the supplied Swagger screenshot shows `GET /knowledge/articles`, `GET /knowledge/articles/{slug}`, and `PUT/DELETE /knowledge/articles/{slug}/bookmark`. The existing Knowledge API follows the screenshot and remains behind `knowledge-endpoints.ts`. The other article endpoints are not called.
- The earlier preferences specification includes `theme`, measurement units, backup, and quiet hours. They are absent from the supplied current preferences contract and are not sent.
- `preferred_reminder_time: null` does not clear a saved time according to the supplied backend behavior. The UI retains the saved value when the input is cleared.
- There is no avatar upload or password reset API in the supplied contract, so these actions are not offered.
- The current local backend at `localhost:8080` was unavailable during implementation. The pregnancy creation request and deletion reauthentication payloads follow the pasted contract but could not be verified against a live OpenAPI document or response.
- The brief requests a “Taste Skill”, but no such skill is installed in the available skill paths. Styling uses the project's existing NutriMom tokens and layout conventions.
