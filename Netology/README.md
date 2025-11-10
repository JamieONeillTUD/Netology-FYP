
# Netology (Final Fade Version)
Simple Flask + PostgreSQL prototype with a 3-step signup wizard using CSS fades.

## Run
```bash
cd Netology/backend
pip install -r requirements.txt
python app.py
```

Open: http://127.0.0.1:5000/login

## DB Config
Edit `backend/config.py` to match your AWS RDS or Docker settings.

## Schema
See `backend/netology_schema.sql`. Create the `users` table via DBeaver or psql.

## Notes
- `psycopg2` is used **only** in `backend/models/user_model.py`.
- Flash messages are enabled for validation feedback.
- Signup wizard fades between steps with pure CSS + minimal JS.
