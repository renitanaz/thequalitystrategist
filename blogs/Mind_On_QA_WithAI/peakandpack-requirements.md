# PeakAndPack Requirements Document

**App:** PeakAndPack, trekking, camping, and travel gear e-commerce
**Version:** 1.0
**Status:** Source of truth for all later testing phases

---

## Risk map (5 feature areas, at a glance)

```
  RISK LEVEL        FEATURE AREA
  ─────────────────────────────────────
  HIGH    ████████  Checkout
  HIGH    ████████  Auth / Orders
  MEDIUM  █████     Cart
  LOW     ███       Products
  LOW     ██        (Sort / display only)
```

This ranking is explained in full in each section below. It is the same ranking used throughout Phases 2 onward, this document is the source of truth for it.

---

## 1. Products

### Functional requirements
- The system must list all products with name, description, price, category, stock, and image.
- Products must be filterable by category (e.g. Trekking, Camping, Mountaineering, Travel).
- Products must be searchable by name or description text.
- Products must be sortable by price (ascending/descending) and by name.

### Non-functional requirements
- Product listing must return within 2 seconds under normal load.
- Product images must load via HTTPS only.

### Acceptance criteria

```
Given the product catalog contains items
When a user requests GET /api/products
Then the response returns 200 with an array of products, each with a non-negative price
```

```
Given a user searches with ?q=tent
When the search executes
Then only products with "tent" in the name or description are returned
```

### Known constraints
- Product images are served from a third-party placeholder service (picsum.photos), not owned infrastructure.
- All prices are assumed to be in USD. No multi-currency support.

### Stated assumptions
- Product names are assumed to be non-empty strings under normal operation.
- Stock values are assumed to be non-negative integers.

---

## 2. Cart

### Functional requirements
- A logged-in user can add a product to their cart with a quantity.
- A logged-in user can view their current cart with line items and total.
- A logged-in user can remove an item from their cart.
- Cart total must be calculated from the product's actual database price, not a client-supplied price.

### Non-functional requirements
- Cart state must persist for the duration of the user's session.
- Cart operations must require authentication (no anonymous cart access).

### Acceptance criteria

```
Given a user is logged in
When they add product ID 3 with quantity 2
Then GET /api/cart returns that item with quantity 2 and a total matching (price * 2)
```

```
Given a user is not logged in
When they attempt any /api/cart request
Then the response is 401 Unauthorized
```

### Known constraints
- Cart is stored in server memory for this demo app, not a persistent database. Cart contents are lost if the server restarts (expected behavior on Render's free tier after inactivity).

### Stated assumptions
- One cart per logged-in user. No guest carts, no multi-cart support.

---

## 3. Checkout

### Functional requirements
- A logged-in user with a non-empty cart can complete checkout.
- A valid discount code must reduce the total by its specified percentage, not more.
- An empty cart must not be allowed to check out.
- Checkout must check product stock before confirming an order.

### Non-functional requirements
- Checkout must complete within 3 seconds under normal load.
- Discount code input must be validated against known codes only (no arbitrary code execution).

### Acceptance criteria

```
Given a cart with a $100 total
When the user applies code SAVE10
Then the total becomes $90, not $0
```

```
Given a cart is empty
When the user attempts checkout
Then the response is 400 Bad Request
```

```
Given a product's stock is 0
When a user attempts to check out with that product in their cart
Then the order is rejected, not silently confirmed
```

### Known constraints
- Only one discount code (`SAVE10`) exists in this demo. No stacking, no expiry dates.

### Stated assumptions
- Discount codes are assumed case-sensitive as entered.

---

## 4. Auth

### Functional requirements
- A new user can register with a name, email, and password.
- A registered user can log in with email and password to receive a session token.
- Registration must reject duplicate email addresses.
- Registration must require a non-empty email and password.

### Non-functional requirements
- Passwords must be stored hashed, never in plain text.
- Session tokens must expire after 24 hours.

### Acceptance criteria

```
Given an email is already registered
When a new registration attempt uses that same email
Then the response is 409 Conflict
```

```
Given a user submits a name field that is an empty string
When registration is attempted
Then the response should reject the request as invalid
(Note: this is currently a known gap, see BUG-006)
```

### Known constraints
- This is a demo auth system. No password reset, no email verification, no multi-factor auth.

### Stated assumptions
- One account per email address.

---

## 5. Orders

### Functional requirements
- A logged-in user can view their own order history.
- An order record must contain order ID, total, status, and timestamp.
- A user must only be able to see their own orders, never another user's.

### Non-functional requirements
- Order history must load within 2 seconds.

### Acceptance criteria

```
Given user A and user B both have placed orders
When user A requests GET /api/orders
Then only user A's orders are returned, not user B's
(Note: this is currently a known gap, see BUG-010)
```

### Known constraints
- Orders cannot be cancelled or modified after checkout in this demo.

### Stated assumptions
- Each order belongs to exactly one user.

---

## Document history

| Version | Change |
|---|---|
| 1.0 | Initial requirements document, covers all 5 feature areas |

This document is the reference point for Phases 2 through 8. Any test result that contradicts this document is either a confirmed bug or a sign this document needs updating, not a guess.
