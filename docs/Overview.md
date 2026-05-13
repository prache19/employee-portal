# Employee Portal — A Simple Overview

This is a small website that a company can use to give its employees a single place to **see their own info, get their salary slips, and check what equipment they've been given**. It also lets the HR team manage all of that from one place.

Think of it as a tiny, self-contained version of the "employee self-service" portals you'd find inside a big HR system — but stripped down and easy to run.

---

## Who uses it

There are two kinds of users:

| User | What they can do |
| --- | --- |
| **Employee** | Log in, see their own profile, download their own salary slips, see equipment assigned to them. |
| **HR Admin** | Everything an employee can do, plus: manage all employees, upload salary slips for anyone, and assign/return company equipment (laptops, monitors, phones, etc.). |

Each person gets one role. Employees can't see other people's data — they only see their own.

---

## The three things it does

The portal is organized into **three sections** (the menu calls them "modules"):

### 1. Profile
Your basic info — name, email, phone, address, photo, role, department, joining date.
- **Employees** can edit a few things (phone, address, photo).
- **HR Admin** can edit everything for anyone.

### 2. Finance — Salary Slips
A list of monthly salary slips as PDF files.
- **Employees** see only their own slips and can download them.
- **HR Admin** uploads a PDF for an employee, picks the month and year, and the employee can grab it from their account.

### 3. Assets — Company Equipment
A list of physical items the company has assigned to people — laptops, monitors, phones, ID cards, and so on.
- **Employees** see what's been assigned to them.
- **HR Admin** can add new equipment, assign it to someone, mark it returned when they leave the company, or delete old records.

---

## How it works (without the technical bits)

When someone opens the site:

1. They see a **login page** and enter their email + password.
2. The system checks if those are correct (the password is stored safely — it's not stored in plain text).
3. If correct, they're taken to a **dashboard** with the three sections above.
4. Everything they see is filtered by who they are. Employees only see their own data; HR sees everyone's.
5. When they log out, or after a while of not being active, the session ends automatically and they have to log in again.

Behind the scenes the data is kept in a **small database file** on the server. Salary-slip PDFs are stored in a folder on the same server.

---

## Trying it out

The project comes with **four demo accounts** so you can try it right away without setting anything up:

| Role | Email | Password |
| --- | --- | --- |
| HR Admin | `hr@company.com` | `Admin@123` |
| Employee | `emp1@company.com` | `Emp@123` |
| Employee | `emp2@company.com` | `Emp@123` |
| Employee | `emp3@company.com` | `Emp@123` |

These are test accounts that get created the first time the app starts. **In a real deployment you'd change these passwords immediately.**

To actually launch the site on your computer, the README has the two-line commands. The shortest route is:

```bash
docker compose up --build
# then open http://localhost:8081 in a browser
```

That's it — Docker downloads everything it needs, sets up the database, creates the demo accounts, and starts the website.

---

## Why this project exists

It's a compact, complete example of a "small business" web app. It shows:

- A clean **login system** with two roles.
- File **uploads and downloads** (the PDFs).
- A **list-and-detail** screen pattern (the employees and assets pages).
- How to wrap all of that into a single **Docker package** that anyone can run on their machine.
- How to put it **behind a real domain name with HTTPS** when you want to share it with a wider group (see [`Deployment.md`](Deployment.md)).

It's small enough to read end-to-end, but realistic enough that you can copy the patterns into a bigger app.

---

## Where to go next

- **Just want to try it?** → [`README.md`](../README.md) (top-level)
- **Want to deploy it somewhere?** → [`Deployment.md`](Deployment.md)
- **Want to see how it's tested?** → [`TESTING.md`](TESTING.md) and [`MANUAL_TESTING.md`](MANUAL_TESTING.md)
- **Curious about the file layout / Docker setup?** → [`DOCKER.md`](DOCKER.md)
