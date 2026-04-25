# Auth-Gated App Testing Playbook (GoldMine)

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: null,
  auth_provider: 'google',
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
curl -X GET "$REACT_APP_BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X GET "$REACT_APP_BACKEND_URL/api/vault" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Email/Password flow
```bash
curl -X POST "$REACT_APP_BACKEND_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"x@y.com","password":"abc12345","name":"X"}'

curl -X POST "$REACT_APP_BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"x@y.com","password":"abc12345"}'
```
Response includes a `token` to be used as `Authorization: Bearer <token>`.

## Step 4: Browser Testing (Playwright)
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None",
}])
await page.goto("https://your-app.com/dashboard")
```
Or simpler: use the `Authorization` header / use UI signup form.

## Checklist
- [ ] Users have `user_id` field (UUID), MongoDB `_id` excluded in API responses
- [ ] `session_token` cookie OR `Authorization: Bearer <token>` works
- [ ] All collections scoped by `user_id`
- [ ] /api/auth/me returns user
- [ ] CRUD on /api/categories, /api/creators, /api/vault, /api/prompts, /api/actions, /api/notes
- [ ] /api/dashboard/stats returns aggregated metrics
